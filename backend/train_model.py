"""
Model Training Entrypoint
-------------------------
Wrapper module aligning with train_model.py from the threat-model repository.
"""

import sys
from ml.training.train import train

if __name__ == "__main__":
    csv_path = sys.argv[1] if len(sys.argv) > 1 else "ml/datasets/training_data.csv"
    train(csv_path)
