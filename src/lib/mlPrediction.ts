export const simulateRandomForestPrediction = (
  historicalAQI: number[],
  currentWindSpeed: number,
  temperature: number
): { predictedAQI: number; confidence: number } => {
  if (historicalAQI.length === 0) return { predictedAQI: 100, confidence: 50 };

  // A basic mock simulation of a model like Random Forest or Linear Regression
  // Weighting the most recent trends more heavily
  const recentData = historicalAQI.slice(-5);
  const trend = recentData.length >= 2 
    ? recentData[recentData.length - 1] - recentData[0]
    : 0;
  
  // Base prediction from the last known value + partial trend
  let predicted = recentData[recentData.length - 1] + (trend * 0.4);

  // Environmental factors (Wind normally disperses pollution)
  if (currentWindSpeed > 15) {
    predicted -= (currentWindSpeed * 0.5); // High wind disperses
  } else if (currentWindSpeed < 5) {
    predicted += 10; // Stagnant air accumulates
  }

  // Temperature (Higher temp might increase ozone but let's keep it simple)
  if (temperature > 30) {
    predicted += 5;
  }

  // Ensure reasonable bounds
  predicted = Math.max(0, Math.min(500, predicted));

  // Mocking confidence score based on data variance
  const variance = Math.abs(trend);
  const baseConfidence = 95;
  // If variance is high, confidence drops
  const confidence = Math.max(60, Math.min(98, baseConfidence - variance * 0.2));

  return {
    predictedAQI: Math.round(predicted),
    confidence: Math.round(confidence),
  };
};

export const evaluateExposureRisk = (aqi: number): { riskLevel: string; recommendation: string } => {
  if (aqi <= 50) return { riskLevel: "LOW RISK", recommendation: "Air quality is satisfactory. Enjoy outdoor activities." };
  if (aqi <= 100) return { riskLevel: "MODERATE RISK", recommendation: "Unusually sensitive people should consider reducing prolonged or heavy exertion." };
  if (aqi <= 150) return { riskLevel: "HIGH RISK", recommendation: "Members of sensitive groups may experience health effects. Limit outdoor exertion." };
  if (aqi <= 200) return { riskLevel: "VERY HIGH RISK", recommendation: "Everyone may begin to experience health effects. Avoid prolonged outdoor exertion." };
  return { riskLevel: "SEVERE RISK", recommendation: "Health warnings of emergency conditions. The entire population is more likely to be affected." };
};
