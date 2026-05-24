"""
Justice Vote Classifier
Predicts whether a Supreme Court justice will vote for the plaintiff (1) or defendant (0).
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

# ─── Feature schema ──────────────────────────────────────────────────────────

ISSUE_AREAS = [
    "civil_rights", "first_amendment", "due_process", "privacy",
    "economic_activity", "federalism", "criminal_procedure", "unions",
    "judicial_power", "interstate_commerce",
]

IDEOLOGICAL_DIRECTIONS = {"liberal": 1, "conservative": 0, "unclear": -1}

JUSTICE_IDEOLOGY = {
    # Historical ideology scores (negative = liberal, positive = conservative)
    "roberts": 0.31,
    "thomas": 0.60,
    "alito": 0.55,
    "sotomayor": -0.48,
    "kagan": -0.40,
    "gorsuch": 0.36,
    "kavanaugh": 0.30,
    "barrett": 0.35,
    "jackson": -0.52,
}


# ─── Feature engineering ─────────────────────────────────────────────────────

def extract_features_from_case(case: dict) -> list:
    """
    Convert a raw case dict into a flat feature vector.

    Expected keys:
        justice_name        str   – one of JUSTICE_IDEOLOGY keys
        issue_area          str   – one of ISSUE_AREAS
        petitioner_type     str   – e.g. 'individual', 'government', 'corporation'
        respondent_type     str   – same options as petitioner_type
        lower_court_direction str – 'liberal' | 'conservative' | 'unclear'
        cert_reason         str   – 'case_conflict' | 'federal_question' | 'other'
        num_amicus_briefs   int   – total amicus briefs filed
        petitioner_amicus   int   – amicus briefs supporting petitioner
        respondent_amicus   int   – amicus briefs supporting respondent
        oral_arg_minutes    float – total oral argument time in minutes
        case_year           int   – year of decision
    """
    justice = case.get("justice_name", "").lower()
    ideology_score = JUSTICE_IDEOLOGY.get(justice, 0.0)

    issue = case.get("issue_area", "")
    issue_vec = [1 if issue == a else 0 for a in ISSUE_AREAS]

    petitioner_map = {"individual": 0, "government": 1, "corporation": 2}
    petitioner_enc = petitioner_map.get(case.get("petitioner_type", ""), -1)
    respondent_enc = petitioner_map.get(case.get("respondent_type", ""), -1)

    lower_dir = IDEOLOGICAL_DIRECTIONS.get(case.get("lower_court_direction", "unclear"), -1)

    cert_map = {"case_conflict": 0, "federal_question": 1, "other": 2}
    cert_enc = cert_map.get(case.get("cert_reason", "other"), 2)

    num_amicus = int(case.get("num_amicus_briefs", 0))
    pet_amicus = int(case.get("petitioner_amicus", 0))
    res_amicus = int(case.get("respondent_amicus", 0))
    amicus_balance = pet_amicus - res_amicus  # positive → petitioner has more support

    oral_minutes = float(case.get("oral_arg_minutes", 60.0))
    year = int(case.get("case_year", 2000))
    years_since_1950 = year - 1950

    features = (
        [ideology_score, petitioner_enc, respondent_enc, lower_dir,
         cert_enc, num_amicus, pet_amicus, res_amicus, amicus_balance,
         oral_minutes, years_since_1950]
        + issue_vec
    )
    return features


def build_feature_dataframe(cases: list[dict]) -> pd.DataFrame:
    """Convert a list of case dicts (each with a 'vote' key) into a feature DataFrame."""
    rows = []
    for c in cases:
        feats = extract_features_from_case(c)
        rows.append(feats + [int(c.get("vote", 0))])

    col_names = (
        ["ideology_score", "petitioner_enc", "respondent_enc", "lower_dir",
         "cert_enc", "num_amicus", "petitioner_amicus", "respondent_amicus",
         "amicus_balance", "oral_minutes", "years_since_1950"]
        + ISSUE_AREAS
        + ["vote"]
    )
    return pd.DataFrame(rows, columns=col_names)


# ─── Synthetic data generator (for demo / testing) ───────────────────────────

def _generate_synthetic_dataset(n: int = 2000, seed: int = 0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    justices = list(JUSTICE_IDEOLOGY.keys())
    party_types = ["individual", "government", "corporation"]
    directions = list(IDEOLOGICAL_DIRECTIONS.keys())
    cert_reasons = ["case_conflict", "federal_question", "other"]

    cases = []
    for _ in range(n):
        justice = rng.choice(justices)
        issue = rng.choice(ISSUE_AREAS)
        lower_dir = rng.choice(directions)
        case_year = int(rng.integers(1990, 2024))
        pet_amicus = int(rng.integers(0, 30))
        res_amicus = int(rng.integers(0, 30))

        case = {
            "justice_name": justice,
            "issue_area": issue,
            "petitioner_type": rng.choice(party_types),
            "respondent_type": rng.choice(party_types),
            "lower_court_direction": lower_dir,
            "cert_reason": rng.choice(cert_reasons),
            "num_amicus_briefs": pet_amicus + res_amicus,
            "petitioner_amicus": pet_amicus,
            "respondent_amicus": res_amicus,
            "oral_arg_minutes": float(rng.uniform(30, 120)),
            "case_year": case_year,
        }
        feats = extract_features_from_case(case)

        # Synthetic label: liberal justices lean toward plaintiff on civil-rights cases
        ideology = JUSTICE_IDEOLOGY[justice]
        liberal_lean = -ideology + (0.3 if issue in ("civil_rights", "first_amendment") else 0)
        reverse_lower = 0.2 if lower_dir == "conservative" else -0.2
        logit = liberal_lean + reverse_lower + rng.normal(0, 0.5)
        vote = int(1 / (1 + np.exp(-logit)) > 0.5)

        case["vote"] = vote
        cases.append(case)

    return build_feature_dataframe(cases)


# ─── Model training ──────────────────────────────────────────────────────────

def train(df: pd.DataFrame) -> RandomForestClassifier:
    features = df.drop(columns=["vote"])
    labels = df["vote"]

    X_train, X_test, y_train, y_test = train_test_split(
        features, labels, test_size=0.2, random_state=42
    )

    model = RandomForestClassifier(n_estimators=200, max_depth=None, random_state=42)
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    print("Accuracy:", accuracy_score(y_test, predictions))
    print(classification_report(y_test, predictions))

    return model


# ─── Inference ───────────────────────────────────────────────────────────────

def predict_vote(model: RandomForestClassifier, case: dict) -> dict:
    """
    Returns:
        {
            "vote": 1 | 0,
            "plaintiff_probability": float,
            "defendant_probability": float,
        }
    """
    col_names = (
        ["ideology_score", "petitioner_enc", "respondent_enc", "lower_dir",
         "cert_enc", "num_amicus", "petitioner_amicus", "respondent_amicus",
         "amicus_balance", "oral_minutes", "years_since_1950"]
        + ISSUE_AREAS
    )
    feats_df = pd.DataFrame([extract_features_from_case(case)], columns=col_names)
    proba = model.predict_proba(feats_df)[0]
    vote = int(model.predict(feats_df)[0])
    classes = list(model.classes_)
    plaintiff_prob = float(proba[classes.index(1)])
    return {
        "vote": vote,
        "plaintiff_probability": plaintiff_prob,
        "defendant_probability": 1.0 - plaintiff_prob,
    }


# ─── Persistence ─────────────────────────────────────────────────────────────

def save_model(model: RandomForestClassifier, path: str = "classifier/model.joblib") -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(model, path)
    print(f"Model saved to {path}")


def load_model(path: str = "classifier/model.joblib") -> RandomForestClassifier:
    return joblib.load(path)


# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Generating synthetic dataset …")
    df = _generate_synthetic_dataset(n=5000)
    print(f"Dataset shape: {df.shape}")

    print("\nTraining Random Forest …")
    model = train(df)

    save_model(model)

    new_case = {
        "justice_name": "sotomayor",
        "issue_area": "civil_rights",
        "petitioner_type": "individual",
        "respondent_type": "government",
        "lower_court_direction": "conservative",
        "cert_reason": "federal_question",
        "num_amicus_briefs": 18,
        "petitioner_amicus": 14,
        "respondent_amicus": 4,
        "oral_arg_minutes": 75.0,
        "case_year": 2023,
    }

    result = predict_vote(model, new_case)
    print(f"\nPrediction for new case:")
    print(f"  Vote for plaintiff:  {result['plaintiff_probability']:.2%}")
    print(f"  Vote for defendant:  {result['defendant_probability']:.2%}")
    print(f"  Predicted vote:      {'plaintiff' if result['vote'] == 1 else 'defendant'}")
