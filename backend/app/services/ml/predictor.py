class PredictorService:
    def predict_likelihood(self, features):
        cvss = features.get("cvss_score", 0)
        ke = features.get("known_exploited", False)
        prob = 0.5
        if cvss > 5.0:
            prob += 0.3
        if ke:
            prob += 0.2
        return min(prob, 0.99), 0.9

predictor_service = PredictorService()
