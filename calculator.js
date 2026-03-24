
class EquilibriumCalculator {
    constructor() {
      
        this.moSpecies = [
            {name: 'MoO4(2-)', p: 1, q: 0, r: 0, logK: 0, K: 1}, 
            {name: 'HMoO4-', p: 1, q: 1, r: 0, logK: 3.49, K: Math.pow(10, 3.49)},
            {name: 'H2MoO4', p: 1, q: 2, r: 0, logK: 7.29, K: Math.pow(10, 7.29)},
            {name: '[Mo7O24](6-)', p: 7, q: 8, r: 4, logK: 52.79, K: Math.pow(10, 52.79)},
            {name: '[HMo7O24](5-)', p: 7, q: 9, r: 4, logK: 57.50, K: Math.pow(10, 57.50)},
            {name: '[H2Mo7O24](4-)', p: 7, q: 10, r: 4, logK: 60.88, K: Math.pow(10, 60.88)},
            {name: '[H3Mo7O24](3-)', p: 7, q: 11, r: 4, logK: 62.86, K: Math.pow(10, 62.86)},
            {name: '[Mo8O26](4-)', p: 8, q: 12, r: 6, logK: 71.49, K: Math.pow(10, 71.49)},
            {name: '[HMo8O26](3-)', p: 8, q: 13, r: 6, logK: 73.29, K: Math.pow(10, 73.29)},
            {name: 'MoO2(2+)', p: 1, q: 4, r: 2, logK: 9.54, K: Math.pow(10, 9.54)}
        ];
    }

    
    getHPlus(pH) {
        return Math.pow(10, -pH);
    }

   
    getOHMinus(pH) {
        return Math.pow(10, pH - 14);
    }

    
    f(MoO4, H, totalMo) {
        let sum = 0;
        for (let species of this.moSpecies) {
            const {p, q, K} = species;
            
            sum += K * p * Math.pow(MoO4, p) * Math.pow(H, q);
        }
        return sum - totalMo;
    }

    
    fPrime(MoO4, H) {
        let sum = 0;
        for (let species of this.moSpecies) {
            const {p, q, K} = species;
            if (p > 0) {
                if (p === 1) {
                   
                    sum += K * p * p * Math.pow(H, q);
                } else {
                    sum += K * p * p * Math.pow(MoO4, p - 1) * Math.pow(H, q);
                }
            }
        }
        return sum;
    }

    
    solveEquilibrium(totalMo, pH, maxIterations = 1000, tolerance = 1e-10) {
        const H = this.getHPlus(pH);
        
       
        let MoO4_i;
        if (pH > 6) {
            
            MoO4_i = totalMo * 0.9;
        } else if (pH > 3) {
         
            MoO4_i = totalMo * 0.1;
        } else {
            
            MoO4_i = totalMo * 0.01;
        }
        
       
        if (MoO4_i <= 0) MoO4_i = totalMo * 0.01;

      
        for (let iter = 0; iter < maxIterations; iter++) {
            
            const f_val = this.f(MoO4_i, H, totalMo);
            const f_prime = this.fPrime(MoO4_i, H);
            
            
            if (Math.abs(f_prime) < 1e-20) {
                
                MoO4_i = MoO4_i * 0.9;
                continue;
            }
            
            const MoO4_next = MoO4_i - f_val / f_prime;
            
           
            const MoO4_i1 = Math.max(MoO4_next, totalMo * 1e-10);
            
          
            const f_next = this.f(MoO4_i1, H, totalMo);
            
            
            if (Math.abs(f_next) <= tolerance) {
                return {
                    MoO4: MoO4_i1,
                    converged: true,
                    iterations: iter + 1,
                    error: Math.abs(f_next)
                };
            }
            
           
            MoO4_i = MoO4_i1;
        }

        
        return {
            MoO4: MoO4_i,
            converged: false,
            iterations: maxIterations,
            error: Math.abs(this.f(MoO4_i, H, totalMo))
        };
    }

  
    calculateMoSpecies(MoO4, H) {
        const species = {};
        for (let spec of this.moSpecies) {
            const {name, p, q, K} = spec;
            
            species[name] = K * Math.pow(MoO4, p) * Math.pow(H, q);
        }
        return species;
    }

    
    calculateTotalMo(MoO4, H) {
        let total = 0;
        for (let spec of this.moSpecies) {
            const {p, q, K} = spec;
            total += K * p * Math.pow(MoO4, p) * Math.pow(H, q);
        }
        return total;
    }

    
    calculateDistribution(totalMo, pHStart, pHEnd, pHStep, maxIterations, tolerance) {
        const results = [];
        const pHValues = [];
        
       
        const numSteps = Math.ceil((pHEnd - pHStart) / pHStep) + 1;
        
        for (let i = 0; i < numSteps; i++) {
            const pH = Math.min(pHStart + i * pHStep, pHEnd);
            pHValues.push(pH);
            
           
            const result = this.solveEquilibrium(totalMo, pH, maxIterations, tolerance);
          
            const H = this.getHPlus(pH);
            
           
            const MoSpecies = this.calculateMoSpecies(result.MoO4, H);
            
            
            const MoTotal = this.calculateTotalMo(result.MoO4, H);
            
            const distribution = {
                pH: pH,
                MoO4: result.MoO4,
                MoSpecies: {},
                converged: result.converged,
                iterations: result.iterations,
                error: result.error
            };
            
           
            for (let speciesName in MoSpecies) {
                const spec = this.moSpecies.find(s => s.name === speciesName);
                if (spec) {
                    const speciesConcentration = MoSpecies[speciesName];
                    
                    const moContribution = spec.p * speciesConcentration;
                    
                    distribution.MoSpecies[speciesName] = MoTotal > 0 ? moContribution / MoTotal : 0;
                }
            }
            
            results.push(distribution);
        }
        
        return {
            pHValues: pHValues,
            distributions: results
        };
    }
}