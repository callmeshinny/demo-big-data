"""Check the English demo talk track's length, metric precision and required Q&A."""

import re
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "docs/DEMO_SCRIPT.md"
REQUIRED_QUESTIONS = (
    "How is a session’s prediction evaluated?",
    "Does the demo run live inference, and how can it be rebuilt?",
    "How is the 30-session sample selected?",
    "Are these toy or real recommendations?",
    "Why might the sample be browsing-heavy?",
    "What does the Recommendation tab show?",
)
DISPLAY_VALUES = (
    "0.1249", "0.1964", "65.94", "0.1299", "44.77", "127.8 MiB",
    "24.2 MiB", "0.454", "0.109", "34.99", "33.57",
    "66.7, 56.9, 55.8 and 55.6",
)


def english_walkthrough(text):
    section = text.split("## Three-minute walkthrough", 1)
    if len(section) != 2:
        return ""
    walkthrough = section[1].split("## Likely questions", 1)[0]
    return " ".join(
        line.removeprefix("**English.**").strip()
        for line in walkthrough.splitlines()
        if line.startswith("**English.**")
    )


def check_text(text):
    walkthrough = english_walkthrough(text)
    words = re.findall(r"\b[\w]+(?:[’'-][\w]+)*\b", walkthrough, re.UNICODE)
    errors = []
    if not 350 <= len(words) <= 430:
        errors.append(f"English walkthrough must be 350–430 words; found {len(words)}")
    if re.search(r"(?<![\w.])\d+\.\d{5,}(?!\d)", walkthrough):
        errors.append("English walkthrough contains metric values with more than four decimal places")
    missing_values = [value for value in DISPLAY_VALUES if value not in walkthrough]
    if missing_values:
        errors.append(f"English walkthrough is missing displayed values: {', '.join(missing_values)}")

    q4 = re.search(
        r"(?ms)^4\. \*\*What does Recall@20 mean\?\*\*(.*?)(?=^\s*\*Tiếng Việt\.|^5\.)",
        text,
    )
    if not q4 or "docs/modeling/model_protocol.md" not in q4.group(1):
        errors.append("Q4 must cite docs/modeling/model_protocol.md")
    for question in REQUIRED_QUESTIONS:
        if question not in text:
            errors.append(f"Missing required Q&A: {question}")
    return errors, len(words)


def main():
    text = SCRIPT.read_text(encoding="utf-8")
    errors, word_count = check_text(text)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print(f"Demo script checks passed: {word_count} English walkthrough words")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
