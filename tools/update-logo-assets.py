from pathlib import Path
import json
import re


ROOT = Path(__file__).resolve().parents[1]
LOGO_PATH = "/assets/images/nanofix-logo-transparent.webp"


def update_legacy_body() -> None:
    path = ROOT / "lib" / "legacy" / "body.html"
    html = path.read_text(encoding="utf-8")
    updated = re.sub(
        r'(<img[^>]*class="[^"]*nanofix-logo-img[^"]*"[^>]*src=")data:image/png;base64,[^"]+(")',
        rf"\1{LOGO_PATH}\2",
        html,
    )
    if updated == html:
        raise RuntimeError("No NANOFIX base64 logo image was replaced in legacy body")
    path.write_text(updated, encoding="utf-8")


def update_schemas() -> None:
    path = ROOT / "lib" / "legacy" / "schemas.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    for item in data:
        if isinstance(item, dict) and item.get("name") == "NANOFIX PTE. LTD.":
            item["image"] = f"https://www.nanofixsg.com{LOGO_PATH}"
            item["logo"] = f"https://www.nanofixsg.com{LOGO_PATH}"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    update_legacy_body()
    update_schemas()
    print(LOGO_PATH)
