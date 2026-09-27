import os
import json
import requests
from typing import Dict, Any


class GrokService:
    """
    AI Storm Analyst — explanation & decision-support layer.

    Design contract (IMPORTANT):
        Weather/radar/lightning observations
            → physics + ML engine  (hazard probabilities, kinematics, ETA)
            → structured assessment (JSON)
            → THIS LAYER (Grok)     → human-readable explanation

    The LLM never forecasts. It receives the engine's structured output and
    explains it — in plain, everyday language — to members of the public
    using the website.
    """

    def __init__(self):
        # Support both GROK_API_KEY and XAI_API_KEY from environment or defaults
        self.api_key = os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY") or ""

        if self.api_key.startswith("gsk_"):
            self.base_url = "https://api.groq.com/openai/v1"
            self.model = "openai/gpt-oss-120b"
            self.provider_label = "AI Storm Analyst · Groq LPU"
        elif self.api_key.startswith("xai-"):
            self.base_url = "https://api.x.ai/v1"
            self.model = "grok-4.7"
            self.provider_label = "AI Storm Analyst · xAI Grok"
        else:
            self.base_url = "https://api.groq.com/openai/v1"
            self.model = "openai/gpt-oss-120b"
            self.provider_label = "AI Storm Analyst · Groq"

    # ------------------------------------------------------------------ #
    #  Shared LLM plumbing
    # ------------------------------------------------------------------ #
    def _complete(self, system_prompt: str, user_prompt: str, max_tokens: int = 900,
                  temperature: float = 0.2, timeout: float = 14.0):
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

        def _extract(resp):
            data = resp.json()
            msg = (data.get("choices") or [{}])[0].get("message", {})
            return (msg.get("content") or "").strip()

        for model, is_retry in ((self.model, False), ("qwen/qwen3.32b", True)):
            body = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            # gpt-oss is a reasoning model: cap its hidden reasoning budget so
            # the visible answer is not starved of completion tokens.
            if model.startswith("openai/gpt-oss"):
                body["reasoning_effort"] = "low"
            try:
                res = requests.post(f"{self.base_url}/chat/completions", headers=headers, json=body, timeout=timeout)
                if res.status_code == 200:
                    content = _extract(res)
                    if content:
                        return content
                    print(f"AI analyst: {model} returned 200 with empty content", flush=True)
                else:
                    print(f"AI analyst LLM HTTP {res.status_code} ({model}): {res.text[:300]}", flush=True)
            except Exception as e:
                tag = "retry" if is_retry else "LLM"
                print(f"AI analyst {tag} exception ({model}):", e, flush=True)
        return None

    # ------------------------------------------------------------------ #
    #  1. Alert explanation: engine assessment → plain-language explainer
    # ------------------------------------------------------------------ #
    def explain_risk(self, assessment: Dict[str, Any]) -> Dict[str, Any]:
        """
        Receives the STRUCTURED ASSESSMENT assembled by the StormSense engine
        (see main.py:_engine_assessment) and returns a human explanation of
        the alert for a visitor to the website.
        """
        payload = json.dumps(assessment, indent=1)
        system_prompt = (
            "You are the StormSense AI Storm Analyst — the friendly staff meteorologist behind the "
            "StormSense website. A regular person has just opened the site and is reading the alert; "
            "you are explaining it to them directly, person to person. "
            "VOICE: warm, plain and confident, like a trusted TV weather presenter talking on air. Use "
            "'you' and 'your area'. Short sentences. No jargon — say 'a strong storm core shows on "
            "radar' instead of dBZ, 'plenty of heat and moisture in the air' instead of CAPE. Use only "
            "the few numbers that matter to a person: how far the storm is, how long they have, and how "
            "likely each hazard is. "
            "IMPORTANT: treat the data below as the real, live observation feed — on this site it IS "
            "current reality. Never call it a simulation, model output, sample or estimate; never "
            "mention engines, JSON, prompts or ML. Speak simply as someone who knows the weather right "
            "now. Never state a figure that is not in the data; if something isn't covered, say what "
            "you'd still need to check. "
            "FORMAT: exactly three parts separated by blank lines, in this order — "
            "1) a line beginning **What's happening.** followed by one short paragraph of two or three "
            "spoken-style sentences; "
            "2) a line beginning **What it means for you.** followed by two or three lines starting "
            "with '• ', each one plain-prose sentence; "
            "3) a line beginning **What you should do.** followed by three numbered actions, each a "
            "single simple sentence a family can follow tonight. "
            "No markdown tables, code blocks, # headings, or nested bullets."
        )
        user_prompt = (
            "Explain the current alert to the visitor now. The storm is tracked toward the named area.\n\n"
            f"CURRENT CONDITIONS (live observation feed — do not change any figure):\n{payload}"
        )

        if self.api_key:
            content = self._complete(system_prompt, user_prompt, max_tokens=1200, temperature=0.3, timeout=16.0)
            if content:
                return {"provider": self.provider_label, "explanation": content, "status": "online"}

        return {
            "provider": "StormSense Convective Reasoning Engine",
            "explanation": self._local_brief(assessment),
            "status": "active_local_mode",
        }

    # ------------------------------------------------------------------ #
    #  2. Ask StormSense AI: grounded Q&A for site visitors
    # ------------------------------------------------------------------ #
    def chat(self, user_message: str, assessment: Dict[str, Any]) -> str:
        persona = (
            "You are the StormSense AI Storm Analyst — the friendly staff meteorologist behind the "
            "StormSense website. A member of the public has opened the site and asked you a question "
            "about the storm near their area. Talk to them directly, person to person. "
            "VOICE: warm, plain and confident — like a weather presenter you trust. Use 'you', 'your "
            "area' and 'your family'. Short sentences, everyday words, no jargon (say 'strong storm "
            "core on radar', not dBZ; 'lots of heat and moisture in the air', not CAPE). Pick only the "
            "few numbers a person needs: distance, time they have, and how likely each hazard is. "
            "IMPORTANT: treat the data below as the real, live observation feed — on this site it IS "
            "current reality. Never call it a simulation, model output, sample or estimate; never "
            "mention engines, JSON, prompts or ML — you simply know the weather right now. Never state "
            "a figure that isn't in the data; if something isn't covered, say what you'd still need to "
            "check. Keep the whole answer under 120 words. "
            "FORMAT: open with one short sentence that directly answers the question. Then up to three "
            "'• ' bullets, each a plain-prose sentence, if they help. Close with one line beginning "
            "'Bottom line:' with the single most practical takeaway. No markdown tables, code blocks "
            "or # headings."
        )
        context_block = (
            f"CURRENT CONDITIONS (live observation feed — authoritative):\n{json.dumps(assessment, indent=1)}\n\n"
            f"VISITOR QUESTION: {user_message}"
        )

        if self.api_key:
            content = self._complete(persona, context_block, max_tokens=800, temperature=0.35, timeout=12.0)
            if content:
                return content

        return self._local_chat(user_message, assessment)

    # ------------------------------------------------------------------ #
    #  Local fallbacks (offline / no key) — same voice, same structure
    # ------------------------------------------------------------------ #
    def _fmt_pct(self, v) -> str:
        try:
            return f"{float(v):.0f} per cent"
        except (TypeError, ValueError):
            return "not available"

    def _local_brief(self, a: Dict[str, Any]) -> str:
        h = a.get("hazards", {})
        s = a.get("storm", {})
        t = a.get("tracking", {})
        target = t.get("target_name", "your area")
        eta = t.get("arrival_minutes", "unknown")
        speed = s.get("speed_kmh", "—")
        bearing = s.get("direction", "—")
        sev = h.get("severity_level", "ELEVATED")
        dbz = a.get("observations", {}).get("max_reflectivity_dbz", "—")
        strikes = a.get("observations", {}).get("total_strikes_1min", "—")
        hail = self._fmt_pct(h.get("hail_probability"))
        ltg = self._fmt_pct(h.get("lightning_probability"))
        rain = self._fmt_pct(h.get("cloudburst_probability"))

        return (
            f"**What's happening.** A strong storm is moving toward {target} at about {speed} kilometres "
            f"per hour, and it could reach your area in roughly {eta} minutes. Radar shows a powerful "
            f"storm core ({dbz} dBZ), so this one is capable of hail, intense rain and plenty of "
            f"lightning — {strikes} strikes were recorded in just the last minute.\n\n"
            f"**What it means for you.**\n"
            f"• Hail is likely — around {hail} — so vehicles, crops and anything left outside could "
            f"take a hit.\n"
            f"• Heavy rain is possible ({rain}), which can flood low-lying roads quickly.\n"
            f"• Lightning risk is {ltg}; being outdoors is the main danger.\n\n"
            f"**What you should do.**\n"
            f"1. Plan to be indoors before the next {eta} minutes — that's your window.\n"
            f"2. Move vehicles under cover if you can, and secure loose things outside.\n"
            f"3. Stay off waterlogged roads and away from open fields and trees once it starts."
        )

    def _local_chat(self, msg: str, a: Dict[str, Any]) -> str:
        m = msg.lower()
        h = a.get("hazards", {})
        t = a.get("tracking", {})
        s = a.get("storm", {})
        eta = t.get("arrival_minutes", "27")
        target = t.get("target_name", "your area")
        dist = t.get("distance_km", "—")
        speed = s.get("speed_kmh", "—")

        if "safe" in m or "outside" in m or "go out" in m:
            return (
                f"Best to be indoors before this one arrives — the storm is about {dist} kilometres away "
                f"and could reach {target} in roughly {eta} minutes.\n"
                f"• Lightning is the immediate danger outdoors ({self._fmt_pct(h.get('lightning_probability'))} "
                f"chance), and hail around {self._fmt_pct(h.get('hail_probability'))}.\n"
                f"Bottom line: finish what you need to do outside in the next {eta} minutes, then get "
                f"under a solid roof and stay there."
            )
        if "hail" in m or "rain" in m or "flood" in m or "when" in m or "time" in m:
            return (
                f"Yes — hail looks likely ({self._fmt_pct(h.get('hail_probability'))}) along with intense "
                f"rain ({self._fmt_pct(h.get('cloudburst_probability'))}).\n"
                f"• The storm is tracking toward {target} at about {speed} km/h, so expect it in around "
                f"{eta} minutes.\n"
                f"• Sudden downpours can flood low-lying stretches fast, so avoid them.\n"
                f"Bottom line: park vehicles under cover now and plan around the next {eta} minutes."
            )
        if "do" in m and ("should" in m or "what" in m) or "prepare" in m or "safe" in m:
            return (
                f"A few simple steps will keep you and your family safe.\n"
                f"• Get everyone indoors before roughly {eta} minutes from now.\n"
                f"• Move vehicles under cover and secure loose items outside.\n"
                f"• Once it starts, keep away from open fields, trees and flooded roads.\n"
                f"Bottom line: treat the next {eta} minutes as your preparation window."
            )
        if "why" in m and ("risk" in m or "alert" in m or "warning" in m):
            return (
                f"Because the storm heading your way is strong and close — it's about {dist} kilometres "
                f"out with roughly {eta} minutes to go.\n"
                f"• Hail around {self._fmt_pct(h.get('hail_probability'))}, heavy rain "
                f"{self._fmt_pct(h.get('cloudburst_probability'))} and lightning "
                f"{self._fmt_pct(h.get('lightning_probability'))}.\n"
                f"• Severity is currently rated {h.get('severity_level', 'ELEVATED')}.\n"
                f"Bottom line: it's a get-ready-now situation, not a wait-and-see one."
            )
        return (
            f"Right now a strong storm sits about {dist} kilometres from {target}, heading your way at "
            f"roughly {speed} km/h.\n"
            f"• Expect hail ({self._fmt_pct(h.get('hail_probability'))}), intense rain "
            f"({self._fmt_pct(h.get('cloudburst_probability'))}) and frequent lightning "
            f"({self._fmt_pct(h.get('lightning_probability'))}).\n"
            f"Bottom line: it could reach you in about {eta} minutes — get ready now, not later."
        )
