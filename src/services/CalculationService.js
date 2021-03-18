/* eslint-disable no-unused-vars */
const FinancialService = require("./FinancialService");
const Big = require("big.js");

const inputs = {
  "winterSetpoint": 20.0,
  "summerSetpoint": 25.0,
  "groundTemperature": 5.0,
  "winterDesignTemperature": -40.0,
  "summerDesignDB": 30.0,
  "summerDesignWB": 21.0,
};

const heatingAndCooling = (variables, optionObjects, isAlternate = false) => {

  // Inputs
  const heatingDeltaT = Big(inputs.winterSetpoint).minus(inputs.winterDesignTemperature);
  const coolingDeltaT = Big(inputs.summerDesignDB).minus(inputs.summerSetpoint);
  const summerSetpointEnthalpy = 50.0;
  const summerDesignEnthalpy = 61.0;
  const coolingDeltaHRaw = Big(summerDesignEnthalpy).minus(summerSetpointEnthalpy); // kJ/kg
  const coolingDeltaH = Big(coolingDeltaHRaw).div(3.6); // Wh/kg
  const airDensity = Big(1).div(0.87);
  const ventilationEfficiency = Big(getOption("ventilation", "efficiency", variables, optionObjects, isAlternate));
  const infiltrationAnnualEnergy = Big(getOption("airtightness", "annualEnergy", variables, optionObjects, isAlternate));
  const infiltrationHeatingLoad = Big(getOption("airtightness", "heatingLoad", variables, optionObjects, isAlternate));
  const ventilation = Big(0.3);
  const infiltrationAnnualEnergyAirflowRate = Big(variables.buildingVolume).times(infiltrationAnnualEnergy);
  const infiltrationHeatingLoadAirflowRate = Big(variables.buildingVolume).times(infiltrationHeatingLoad);
  const ventilationAirflowRate = Big(variables.interiorFloorArea).times(2.5).times(ventilation);

  // Calculations
  // Opaque Assemblies
  // U Value (W/m2K)
  const wallAboveGradeU = Big(getOption("wallAboveGrade", "u", variables, optionObjects, isAlternate));
  const wallBelowGradeU = Big(getOption("wallBelowGrade", "u", variables, optionObjects, isAlternate));
  const roofU = Big(getOption("roof", "u", variables, optionObjects, isAlternate));
  const floorU = Big(getOption("floor", "u", variables, optionObjects, isAlternate));
  const doorU = Big(getOption("solidDoor", "u", variables, optionObjects, isAlternate));
  // Area (m2)
  const height = Big(variables.height);
  const length = Big(variables.length);
  const width = Big(variables.width);
  const north = Big(variables.north);
  const east = Big(variables.east);
  const south = Big(variables.south);
  const west = Big(variables.west);
  const depth = Big(variables.depth);
  const exteriorSolidDoorArea = Big(variables.exteriorSolidDoorArea);
  const a = length.times(height).times(2);
  const b = width.times(height).times(2);
  const c = north.plus(east).plus(south).plus(west).plus(exteriorSolidDoorArea);
  const wallAboveGradeArea = a.plus(b).minus(c);
  const d = length.times(depth).times(2);
  const e = width.times(depth).times(2);
  const wallBelowGradeArea = d.plus(e);
  const roofArea = Big(variables.roofArea);
  const floorArea = Big(variables.floorArea);
  const doorArea = exteriorSolidDoorArea;

  // Heating (Delta T C)
  const wallAboveGradeHeating = heatingDeltaT;
  const wallBelowGradeHeating = Big(inputs.winterSetpoint).minus(inputs.groundTemperature);
  const roofHeating = heatingDeltaT;
  const floorHeating = Big(inputs.winterSetpoint).minus(inputs.groundTemperature);
  const doorHeating = heatingDeltaT;
  // Q = UA Delta T
  // Transmission (W)
  const wallAboveGradeTransmission = Big(wallAboveGradeU).times(wallAboveGradeArea).times(wallAboveGradeHeating);
  const wallBelowGradeTransmission = Big(wallBelowGradeU).times(wallBelowGradeArea).times(wallBelowGradeHeating);
  const roofTransmission = Big(roofU).times(roofArea).times(roofHeating);
  const floorTransmission = Big(floorU).times(floorArea).times(floorHeating);
  const doorTransmission = Big(doorU).times(doorArea).times(doorHeating);
  // Q = V Delta T c
  // Infiltration (W)
  const wallAboveGradeInfiltration = Big(infiltrationHeatingLoadAirflowRate).times(heatingDeltaT).times(0.33);
  // Ventilation (W)
  const wallAboveGradeVentilation = Big(ventilationAirflowRate).times(heatingDeltaT).times(0.33).times(Big(1.0).minus(ventilationEfficiency));
  // Solar Gains
  // Window Shading Faator
  const windowShadingFactor = 0.75 * 0.95 * 0.85 * 0.75;

  // Cooling (Delta T C)
  const wallAboveGradeCoolingDeltaT = Big(coolingDeltaT);
  const roofCoolingDeltaT = Big(coolingDeltaT);
  const doorCoolingDeltaT = Big(coolingDeltaT);
  const wallAboveGradeCoolingTransmission = Big(wallAboveGradeU).times(wallAboveGradeArea).times(wallAboveGradeCoolingDeltaT);
  const roofCoolingTransmission = Big(roofU).times(roofArea).times(roofCoolingDeltaT);
  const doorCoolingTransmission = Big(doorU).times(doorArea).times(doorCoolingDeltaT);
  const coolingInfiltration = Big(airDensity).times(infiltrationHeatingLoadAirflowRate).times(coolingDeltaH);
  const coolingVentilation = Big(airDensity).times(ventilationAirflowRate).times(coolingDeltaT).times(Big(1.0).minus(ventilationEfficiency));
  const peopleWPer = Big(130);
  const lightingWm2 = Big(5);
  const equipmentWm2 = Big(5);
  const people = Big(peopleWPer).times(variables.people);
  const lighting = Big(lightingWm2).times(variables.interiorFloorArea);
  const equipment = Big(equipmentWm2).times(variables.interiorFloorArea);

  // Transparent Assemblies
  const northU = getOption('windows', 'u', variables, optionObjects, isAlternate);
  const eastU = getOption('windows', 'u', variables, optionObjects, isAlternate);
  const southU = getOption('windows', 'u', variables, optionObjects, isAlternate);
  const westU = getOption('windows', 'u', variables, optionObjects, isAlternate);
  const northSHGC = getOption('windows', 'shgc', variables, optionObjects, isAlternate);
  const eastSHGC = getOption('windows', 'shgc', variables, optionObjects, isAlternate);
  const southSHGC = getOption('windows', 'shgc', variables, optionObjects, isAlternate);
  const westSHGC = getOption('windows', 'shgc', variables, optionObjects, isAlternate);
  const northGlazingArea = Big(north).times(0.75);
  const eastGlazingArea = Big(east).times(0.75);
  const southGlazingArea = Big(south).times(0.75);
  const westGlazingArea = Big(west).times(0.75);
  const summerShadingFactor = 0.60;
  const northDirection = 360;
  const eastDirection = 90
  const southDirection = 180;
  const westDirection = 270;
  const northSolarGains = 93;
  const eastSolarGains = 285;
  const southSolarGains = 108;
  const westSolarGains = 285;
  const northHeatingLoad = Big(northU).times(north).times(Big(inputs.winterSetpoint).minus(inputs.winterDesignTemperature));
  const eastHeatingLoad = Big(eastU).times(east).times(Big(inputs.winterSetpoint).minus(inputs.winterDesignTemperature));
  const southHeatingLoad = Big(southU).times(south).times(Big(inputs.winterSetpoint).minus(inputs.winterDesignTemperature));
  const westHeatingLoad = Big(westU).times(west).times(Big(inputs.winterSetpoint).minus(inputs.winterDesignTemperature));
  const northCoolingLoadConduction = Big(northU).times(north).times(Big(inputs.summerDesignDB).minus(inputs.summerSetpoint));
  const eastCoolingLoadConduction = Big(eastU).times(east).times(Big(inputs.summerDesignDB).minus(inputs.summerSetpoint));
  const southCoolingLoadConduction = Big(southU).times(south).times(Big(inputs.summerDesignDB).minus(inputs.summerSetpoint));
  const westCoolingLoadConduction = Big(westU).times(west).times(Big(inputs.summerDesignDB).minus(inputs.summerSetpoint));
  const northCoolingSolarGain = Big(northSHGC).times(northGlazingArea).times(summerShadingFactor).times(northSolarGains);
  const eastCoolingSolarGain = Big(eastSHGC).times(eastGlazingArea).times(summerShadingFactor).times(eastSolarGains);
  const southCoolingSolarGain = Big(southSHGC).times(southGlazingArea).times(summerShadingFactor).times(southSolarGains);
  const westCoolingSolarGain = Big(westSHGC).times(westGlazingArea).times(summerShadingFactor).times(westSolarGains);
  const northTotalCoolingLoad = Big(northCoolingLoadConduction).plus(northCoolingSolarGain);
  const eastTotalCoolingLoad = Big(eastCoolingLoadConduction).plus(eastCoolingSolarGain);
  const southTotalCoolingLoad = Big(southCoolingLoadConduction).plus(southCoolingSolarGain);
  const westTotalCoolingLoad = Big(westCoolingLoadConduction).plus(westCoolingSolarGain);

  const totalHeatingQ = Big(wallAboveGradeTransmission).plus(wallBelowGradeTransmission).plus(roofTransmission).plus(floorTransmission).plus(doorTransmission).plus(wallAboveGradeInfiltration).plus(wallAboveGradeVentilation).plus(northHeatingLoad).plus(eastHeatingLoad).plus(southHeatingLoad).plus(westHeatingLoad);
  const totalCoolingQ = Big(wallAboveGradeCoolingTransmission).plus(roofCoolingTransmission).plus(doorCoolingTransmission).plus(coolingInfiltration).plus(coolingVentilation).plus(people).plus(lighting).plus(equipment).plus(northTotalCoolingLoad).plus(eastTotalCoolingLoad).plus(southTotalCoolingLoad).plus(westTotalCoolingLoad);

  return {
    infiltrationHeatingLoad,
    infiltrationHeatingLoadAirflowRate,
    heatingDeltaT,
    wallAboveGradeInfiltration,
    wallAboveGradeVentilation,
    totalHeatingQ,
    totalCoolingQ,
  };
};

const annualSpaceHeating = (variables, optionObjects, isAlternate = false) => {
  const groundReductionFactor = 0.5;
  // Transmission Losses
  const height = parseFloat(variables.height);
  const length = parseFloat(variables.length);
  const width = parseFloat(variables.width);
  const north = parseFloat(variables.north);
  const east = parseFloat(variables.east);
  const south = parseFloat(variables.south);
  const west = parseFloat(variables.west);
  const depth = parseFloat(variables.depth);
  const exteriorSolidDoorArea = parseFloat(variables.exteriorSolidDoorArea);
  const northU = getOption('windows', 'u', variables, optionObjects, isAlternate);
  const eastU = getOption('windows', 'u', variables, optionObjects, isAlternate);
  const southU = getOption('windows', 'u', variables, optionObjects, isAlternate);
  const westU = getOption('windows', 'u', variables, optionObjects, isAlternate);
  const wallAboveGradeArea = 2 * (length * height) +
                             2 * (width * height) -
                             (north + east + south + west + exteriorSolidDoorArea);
  const wallBelowGradeArea = 2 * (length * depth) + 
                             2 * (width * depth);
  const roofArea = parseFloat(variables.roofArea);
  const floorArea = parseFloat(variables.floorArea);
  const doorArea = exteriorSolidDoorArea;
  const windowArea = north + east + south + west;
  const wallAboveGradeU = getOption("wallAboveGrade", "u", variables, optionObjects, isAlternate);
  const wallBelowGradeU = getOption("wallBelowGrade", "u", variables, optionObjects, isAlternate);
  const roofU = getOption("roof", "u", variables, optionObjects, isAlternate);
  const floorU = getOption("floor", "u", variables, optionObjects, isAlternate);
  const doorU = getOption("solidDoor", "u", variables, optionObjects, isAlternate);
  const windowsU = (northU + eastU + southU + westU) / 4;
  const heatingDegreeHours = parseFloat(variables.heatingDegreeHours);
  const wallAboveGradeG1 = heatingDegreeHours;
  const wallBelowGradeG1 = groundReductionFactor * heatingDegreeHours;
  const roofG1 = heatingDegreeHours;
  const floorG1 = heatingDegreeHours * groundReductionFactor;
  const exteriorDoorsG1 = heatingDegreeHours;
  const windowsG1 = heatingDegreeHours;
  const wallAboveGradeG1kwha = wallAboveGradeArea * wallAboveGradeU * wallAboveGradeG1;
  const wallBelowGradeG1kwha = wallBelowGradeArea * wallBelowGradeU * wallBelowGradeG1;
  const roofG1kwha = roofArea * roofU * roofG1;
  const floorG1kwha = floorArea * floorU * floorG1;
  const exteriorDoorsG1kwha = doorArea * doorU * exteriorDoorsG1;
  const windowsG1kwha = windowArea * windowsU * windowsG1;
  const totalG1kwha = wallAboveGradeG1kwha + wallBelowGradeG1kwha + roofG1kwha + floorG1kwha + exteriorDoorsG1kwha + windowsG1kwha;

  // Ventilation + Infiltration Losses
  const ventilationRaw = 0.3;
  const ventilationEfficiency = getOption("ventilation", "efficiency", variables, optionObjects, isAlternate);
  const ventilationLoss = ventilationRaw * (1 - ventilationEfficiency);
  const infiltrationLoss = getOption("airtightness", "annualEnergy", variables, optionObjects, isAlternate);
  const totalLoss = parseFloat(ventilationLoss) + parseFloat(infiltrationLoss);
  const ventilationVolume = variables.interiorFloorArea * 2.5;
  const infiltrationVolume = variables.interiorFloorArea * 2.5;
  const ventilationCAir = 0.33;
  const infiltrationCAir = 0.33;
  const ventilationG1 = heatingDegreeHours;
  const infiltrationG1 = heatingDegreeHours;
  const ventilationkwha = ventilationLoss * ventilationVolume * ventilationCAir * ventilationG1;
  const infiltrationkwha = infiltrationLoss * infiltrationVolume * infiltrationCAir * infiltrationG1;

  // Solar Gains
  const northWinterShadingFactor = 0.75 * 0.95 * 0.85 * 0.75;
  const eastWinterShadingFactor = 0.75 * 0.95 * 0.85 * 0.75;
  const southWinterShadingFactor = 0.75 * 0.95 * 0.85 * 0.75;
  const westWinterShadingFactor = 0.75 * 0.95 * 0.85 * 0.75;
  const northSHGC = getOption('windows', 'shgc', variables, optionObjects, isAlternate);
  const eastSHGC = getOption('windows', 'shgc', variables, optionObjects, isAlternate);
  const southSHGC = getOption('windows', 'shgc', variables, optionObjects, isAlternate);
  const westSHGC = getOption('windows', 'shgc', variables, optionObjects, isAlternate);
  const northRadiation = 133.0;
  const eastRadiation = 374.0;
  const southRadiation = 790.0;
  const westRadiation = 382.0;
  const northKwha = northWinterShadingFactor * northSHGC * north * northRadiation;
  const eastKwha = eastWinterShadingFactor * eastSHGC * east * eastRadiation;
  const southKwha = southWinterShadingFactor * southSHGC * south * southRadiation;
  const westKwha = westWinterShadingFactor * westSHGC * west * westRadiation;
  const totalSolarGainsKwha = northKwha + eastKwha + southKwha + westKwha;

  // Internal Heat Gains
  const lengthOfHeatingPeriod = 215.0;
  const specPower = 2.5;
  const totalInternalHeatGainsKwha = lengthOfHeatingPeriod * specPower * variables.interiorFloorArea * 0.024;
  const totalGains = totalSolarGainsKwha + totalInternalHeatGainsKwha;
  const utilizationFactor = 0.85;
  
  // Totals
  const annualHeatingDemand = totalLoss - (totalGains * utilizationFactor);
  const spaceHeatingDemand = annualHeatingDemand / variables.interiorFloorArea;

  return {
    totalG1kwha,
    ventilationkwha,
    infiltrationkwha,
    annualHeatingDemand,
    spaceHeatingDemand
  };
};

const output = (variables, optionObjects, heatingAndCooling, annualSpaceHeating, isAlternate) => {
  const dhwDistributionLosses = 300.0;
  const heatingLoad = (heatingAndCooling.totalHeatingQ / 1000 * 1.1).toFixed(1);
  const coolingLoad = (heatingAndCooling.totalCoolingQ / 1000).toFixed(1);
  const spaceHeating = -(annualSpaceHeating.annualHeatingDemand / getOption("heating", "efficiency", variables, optionObjects, isAlternate)).toFixed(0);
  const hotWater = ((
                    25.0 * parseFloat(getOption("hotWaterFixtures", "flow", variables, optionObjects, isAlternate)) + 
                    parseFloat(getOption("hotWaterHeaterStorage", "value", variables, optionObjects, isAlternate)) +
                    dhwDistributionLosses
                  ) / parseFloat(getOption("hotWaterHeater", "efficiency",variables, optionObjects, isAlternate)) *
                  (1.0 - parseFloat(getOption("drainWaterHeatRecovery", "efficiency", variables, optionObjects, isAlternate))) *
                  parseFloat(variables.units)).toFixed(0);
  const lightsAppliancesPlugs = (getOption("lighting", "value", variables, optionObjects, isAlternate) + getOption("appliances", "value", variables, optionObjects, isAlternate) + getOption("plugLoads", "value", variables, optionObjects, isAlternate)) * 365 * parseFloat(variables.units);
  const totalEnergyConsumption = parseFloat(spaceHeating) + parseFloat(hotWater) + parseFloat(lightsAppliancesPlugs);
  const spaceHeatingDemand = (annualSpaceHeating.spaceHeatingDemand).toFixed(0);
  const spaceHeatingCost = variables[getOption("spaceHeatingFuelType", "priceKey", variables, optionObjects, isAlternate)];
  const hotWaterCost = variables[getOption("hotWaterFuelType", "priceKey", variables, optionObjects, isAlternate)];
  const lightsAppliancesPlugsCost = variables[getOption("lightsAppliancesPlugsFuelType", "priceKey", variables, optionObjects, isAlternate)];
  const totalEnergyCosts = spaceHeatingCost + hotWaterCost + lightsAppliancesPlugsCost;

  return {
    heatingLoad,
    coolingLoad,
    spaceHeating,
    hotWater,
    lightsAppliancesPlugs,
    totalEnergyConsumption,
    spaceHeatingDemand,
    spaceHeatingCost,
    hotWaterCost,
    lightsAppliancesPlugsCost,
    totalEnergyCosts,
  };
};

const getEconomics = (variables, outputA, outputB) => {
  const designCost = parseFloat(variables.designCost);
  const designQuantity = parseFloat(variables.designQuantity);
  const airtightnessCost = parseFloat(variables.airtightnessCost)
  const airtightnessQuantity = parseFloat(variables.airtightnessQuantity);
  const windowsCost = parseFloat(variables.windowsCost);
  const windowsQuantity = parseFloat(variables.windowsQuantity);
  const insulationCost = parseFloat(variables.insulationCost);
  const insulationQuantity = parseFloat(variables.insulationQuantity);
  const ventilationCost = parseFloat(variables.ventilationCost);
  const ventilationQuantity = parseFloat(variables.ventilationQuantity);
  const heatPumpCost = parseFloat(variables.heatPumpCost);
  const heatPumpQuantity = parseFloat(variables.heatPumpQuantity);
  const waterHeaterCost = parseFloat(variables.waterHeaterCost);
  const waterHeaterQuantity = parseFloat(variables.waterHeaterQuantity);
  const solarCost = parseFloat(variables.solarCost);
  const solarQuantity = parseFloat(variables.solarQuantity);
  const batteryCost = parseFloat(variables.batteryCost);
  const batteryQuantity = parseFloat(variables.batteryQuantity);
  const energyMonitorCost = parseFloat(variables.energyMonitorCost);
  const energyMonitorQuantity = parseFloat(variables.energyMonitorQuantity);

  const design = designCost * designQuantity;
  const airtightness = airtightnessCost * airtightnessQuantity;
  const windows = windowsCost * windowsQuantity;
  const insulation = insulationCost * insulationQuantity;
  const ventilation = ventilationCost * ventilationQuantity;
  const heatPump = heatPumpCost * heatPumpQuantity;
  const waterHeater = waterHeaterCost * waterHeaterQuantity;
  const solar = solarCost * solarQuantity;
  const battery = batteryCost * batteryQuantity;
  const energyMonitor = energyMonitorCost * energyMonitorQuantity;
  const total = design + airtightness + windows + insulation + ventilation + heatPump + waterHeater + solar + battery + energyMonitor;

  // Business Case
  const investment = total;
  const annualSavings = outputA.totalEnergyCosts;
  const payback = total / annualSavings;
  const guess = 0.06;
  const years = [];
  const numberOfYears = 21;
  const startingYear = 1;
  const energyInflation = 0.02;
  let accumulation = null;
  let accumulationSum = 0;
  let netSavings = 0;
  for (let year = startingYear; year <= numberOfYears; year++) {
    accumulation = year === startingYear ? investment : accumulation - annualSavings;
    netSavings += year === startingYear ? -investment : annualSavings;
    accumulationSum += accumulation;
  }
  const irr = FinancialService.IRR(accumulationSum, 0.06);
  const paceLoanTerm = parseInt(variables.paceLoanTerm);
  const interest = parseFloat(variables.interest);
  const monthsInYear = 12;
  const monthlyPayments = -FinancialService.PMT(interest/monthsInYear, paceLoanTerm * monthsInYear, investment);
  const monthlySavings = annualSavings / monthsInYear;
  const monthlyNetSavings = monthlySavings - monthlyPayments;

  return {
    annualSavings,
    accumulationSum,
    investment,
    irr,
    monthlyPayments,
    monthlySavings,
    monthlyNetSavings
  }
};

const getOption = (key, subkey, variables, optionObjects, isAlternate) => {
  const optionKey = isAlternate ? key + "B" : key;
  const options = optionObjects[optionKey] || optionObjects[key];
  if (options == null) {
    return null;
  }
  const option = options.values.find(el => { 
    const elArray = Object.entries(el);
    return elArray[0][0] === variables[optionKey];
  });

  const variable = variables?.[optionKey];

  if (key === "airtightness" && isAlternate && subkey === "heatingLoad") {
    // console.log(option);
  }
  return option?.[variable]?.[subkey];
};

const run = (variables, optionObjects) => {
  const isAlternate = true;
  const heatingAndCoolingA = heatingAndCooling(variables, optionObjects);
  const heatingAndCoolingB = heatingAndCooling(variables, optionObjects, isAlternate);
  const annualSpaceHeatingA = annualSpaceHeating(variables, optionObjects);
  const annualSpaceHeatingB = annualSpaceHeating(variables, optionObjects, isAlternate);
  const outputA = output(variables, optionObjects, heatingAndCoolingA, annualSpaceHeatingA);
  const outputB = output(variables, optionObjects, heatingAndCoolingB, annualSpaceHeatingB, isAlternate);
  const economics = getEconomics(variables, outputA, outputB);

  return {
    heatingAndCoolingA,
    annualSpaceHeatingA,
    heatingAndCoolingB,
    annualSpaceHeatingB,
    outputA,
    outputB,
    economics,
  };
};

const CalculationService = {
  run,
  getOption,
  output,
  getEconomics,
  heatingAndCooling,
  annualSpaceHeating,
};

export default CalculationService;
