import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WelcomePage.css";

/* ── Terminal lines ── */
type LineStyle = "cmd" | "ok" | "tbl" | "live" | "res" | "";

interface TLine { text: string; delay: number; s: LineStyle }

const LINES: TLine[] = [
  { text: "$ matchdb connect --host matchingdb.com --ssl", delay: 0,    s: "cmd" },
  { text: "  Establishing secure connection...",            delay: 440,  s: "ok"  },
  { text: "  TLS 1.3 handshake complete          [OK]",    delay: 780,  s: "ok"  },
  { text: "  Authentication successful            [OK]",   delay: 1020, s: "ok"  },
  { text: "  Connected to MatchDB v97.2026        [OK]",   delay: 1260, s: "ok"  },
  { text: "",                                               delay: 1480, s: ""    },
  { text: "> SHOW DATABASES;",                              delay: 1700, s: "cmd" },
  { text: "  +---------------------+------------+----------+", delay: 1940, s: "tbl" },
  { text: "  | database            | status     | records  |", delay: 2000, s: "tbl" },
  { text: "  +---------------------+------------+----------+", delay: 2060, s: "tbl" },
  { text: "  | jobs                | LIVE (*)   |  4,821   |", delay: 2240, s: "live" },
  { text: "  | sales               | coming     |   --     |", delay: 2400, s: "tbl"  },
  { text: "  | rentals             | coming     |   --     |", delay: 2480, s: "tbl"  },
  { text: "  | auctions            | coming     |   --     |", delay: 2560, s: "tbl"  },
  { text: "  | polling             | coming     |   --     |", delay: 2640, s: "tbl"  },
  { text: "  | matrimony           | coming     |   --     |", delay: 2720, s: "tbl"  },
  { text: "  | dating              | coming     |   --     |", delay: 2800, s: "tbl"  },
  { text: "  | personals           | coming     |   --     |", delay: 2880, s: "tbl"  },
  { text: "  +---------------------+------------+----------+", delay: 2960, s: "tbl"  },
  { text: "  8 rows in set (0.001 sec)",                     delay: 3120, s: "ok"  },
  { text: "",                                                delay: 3280, s: ""    },
  { text: "> SELECT * FROM opportunities WHERE match = 1;",  delay: 3480, s: "cmd" },
  { text: "  -> Your next opportunity is one query away.",   delay: 4080, s: "res" },
];

const CLASS_MAP: Record<LineStyle, string> = {
  cmd:  "wlc-line wlc-line-cmd",
  ok:   "wlc-line wlc-line-ok",
  tbl:  "wlc-line wlc-line-tbl",
  live: "wlc-line wlc-line-live",
  res:  "wlc-line wlc-line-res",
  "":   "wlc-line wlc-line-ok",
};

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const termRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  const [ctaVisible, setCtaVisible] = useState(false);

  /* Reveal lines one by one */
  useEffect(() => {
    LINES.forEach((line, i) => {
      setTimeout(() => {
        setShown(i + 1);
        if (i === LINES.length - 1) {
          setTimeout(() => setCtaVisible(true), 600);
        }
      }, line.delay);
    });
  }, []);

  /* Auto-scroll terminal as lines appear */
  useEffect(() => {
    const el = termRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown]);

  const openLogin = (type: "candidate" | "vendor") => {
    navigate(`/jobs/${type}`);
    window.dispatchEvent(
      new CustomEvent("matchdb:openLogin", {
        detail: { context: type, mode: "login" },
      }),
    );
  };

  const doneLines = LINES.slice(0, shown);
  const stillTyping = shown < LINES.length;

  return (
    <div className="wlc-root">
      <div className="wlc-window">

        {/* ── Title bar ── */}
        <div className="wlc-titlebar">
          <span className="wlc-titlebar-icon">🗄️</span>
          <span className="wlc-titlebar-title">
            MatchDB Query Terminal — v97.2026
          </span>
          <span className="wlc-titlebar-meta">
            {shown < LINES.length ? "Connecting..." : "8 databases loaded"}
          </span>
        </div>

        {/* ── Menu bar ── */}
        <div className="wlc-menubar">
          <span className="wlc-menu-item">Query</span>
          <span className="wlc-menu-item active">Connect</span>
          <span className="wlc-menu-item">Databases</span>
          <span className="wlc-menu-item">Help</span>
        </div>

        {/* ── Body ── */}
        <div className="wlc-body">

          {/* Sunken terminal output */}
          <div className="wlc-term" ref={termRef}>
            {doneLines.map((line, i) => (
              <div key={i} className={CLASS_MAP[line.s]}>
                {line.text || "\u00A0"}
              </div>
            ))}

            {/* Blinking cursor while typing or before CTA */}
            {(stillTyping || !ctaVisible) && (
              <div className="wlc-line wlc-line-cmd">
                <span className="wlc-cursor">█</span>
              </div>
            )}
          </div>

          {/* ── CTA — appears after typewriter completes ── */}
          {ctaVisible && (
            <div className="wlc-cta">
              <div className="wlc-cta-text">
                <div className="wlc-cta-headline">Welcome to MatchDB</div>
                <div className="wlc-cta-sub">
                  The data-driven marketplace &middot; 8 modules &middot; 1 live
                </div>
              </div>
              <div className="wlc-cta-btns">
                <button
                  className="wlc-btn wlc-btn-primary"
                  onClick={() => navigate("/jobs")}
                >
                  <span>💼</span>
                  <span>Browse Jobs</span>
                </button>
                <button className="wlc-btn" onClick={() => openLogin("candidate")}>
                  <span>👤</span>
                  <span>Candidate Login</span>
                </button>
                <button className="wlc-btn" onClick={() => openLogin("vendor")}>
                  <span>🏢</span>
                  <span>Vendor Login</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Status bar ── */}
        <div className="wlc-statusbar">
          <span>{ctaVisible ? "Ready" : "Connecting to matchingdb.com..."}</span>
          <span>matchingdb.com</span>
          <span>8 databases</span>
        </div>

      </div>
    </div>
  );
};

export default WelcomePage;
