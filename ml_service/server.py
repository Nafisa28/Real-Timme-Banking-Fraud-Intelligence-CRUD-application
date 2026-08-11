import os
from flask import Flask, request, jsonify
from model import ml_model

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "service": "Fraud Intelligence ML Scoring Engine",
        "model_version": ml_model.version,
        "metrics": ml_model.model_metrics
    })

@app.route('/score', methods=['POST'])
def score():
    try:
        data = request.json or {}
        result = ml_model.predict_proba(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/retrain', methods=['POST'])
def retrain():
    try:
        body = request.json or {}
        num_samples = int(body.get("samples", 1000))
        metrics = ml_model.train_on_synthetic(num_samples)
        return jsonify({
            "message": "ML model successfully retrained on synthetic dataset",
            "metrics": metrics,
            "version": ml_model.version
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"ML Scoring Service running on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
