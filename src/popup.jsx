import React, { useState, useEffect } from "react";
import { render } from "react-dom";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import Spinner from "react-bootstrap/Spinner";
import Chevron from "react-chevron";

import "bootstrap/dist/css/bootstrap.min.css";

import { fetchCodeforcesStreak } from "./codeforces";

const CHALLENGE_QUERY = JSON.stringify({
  query: `query questionOfToday {
    activeDailyCodingChallengeQuestion {
      date
      userStatus
      link
      question {
        acRate
        difficulty
        freqBar
        frontendQuestionId: questionFrontendId
        isFavor
        paidOnly: isPaidOnly
        status
        title
        titleSlug
        hasVideoSolution
        hasSolution
        topicTags { name id slug }
      }
    }
  }`,
});

const USER_QUERY = JSON.stringify({
  query: `query globalData {
    userStatus { userId isSignedIn username }
  }`,
});

const STREAK_QUERY = JSON.stringify({
  query: `query getStreakCounter {
    streakCounter {
      streakCount
      daysSkipped
      currentDayCompleted
    }
  }`,
});

function ExternalLink({ href, className, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}

function QuestionDifficulty({ difficulty }) {
  const bg =
    { Easy: "success", Medium: "warning", Hard: "danger" }[difficulty] ||
    "secondary";

  return (
    <Badge bg={bg} className="ms-2">
      {difficulty}
    </Badge>
  );
}

function TopicTags({ topicTags }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2">
      <div
        className="small"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: "pointer" }}
      >
        <Chevron direction={expanded ? "down" : "right"} /> Topic tags
      </div>

      {expanded && (
        <div className="mt-1 d-flex flex-wrap gap-1">
          {topicTags.map((topic) => (
            <Badge key={topic} bg="light" text="dark" className="border">
              {topic}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// One reusable card shell for every platform
function PlatformCard({ title, subtitle, badge, children }) {
  return (
    <Card className="mb-2 shadow-sm border-0">
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <div className="fw-bold">{title}</div>
            <small className="text-muted">{subtitle}</small>
          </div>
          {badge}
        </div>
        {children}
      </Card.Body>
    </Card>
  );
}

function Checking({ text }) {
  return (
    <div className="text-muted small">
      <Spinner animation="border" size="sm" className="me-2" />
      {text}
    </div>
  );
}

function Popup() {
  const [status, setStatus] = useState("Loading");
  const [problem, setProblem] = useState("");
  const [problemDifficulty, setProblemDifficulty] = useState("");
  const [topicTags, setTopicTags] = useState([]);
  const [problemLink, setProblemLink] = useState("");
  const [userName, setUserName] = useState(null);
  const [profileLink, setProfileLink] = useState("");
  const [streak, setStreak] = useState(null);

  // Codeforces: cfHandle is null while settings load, "" when not configured
  const [cfHandle, setCfHandle] = useState(null);
  const [cfStreak, setCfStreak] = useState(null);
  const [cfError, setCfError] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(
      { codeforcesHandle: "" },
      ({ codeforcesHandle }) => {
        setCfHandle(codeforcesHandle);

        if (!codeforcesHandle) {
          return;
        }

        fetchCodeforcesStreak(codeforcesHandle)
          .then((data) => {
            setCfStreak(data);
          })
          .catch((error) => {
            console.error("Codeforces request failed:", error);
            setCfError(true);
          });
      }
    );

    chrome.cookies.getAll(
      { domain: "leetcode.com", name: "LEETCODE_SESSION" },
      (cookies) => {
        const headers = new Headers();
        headers.append("Content-Type", "application/json");
        if (cookies && cookies.length > 0) {
          headers.append("LEETCODE_SESSION", cookies[0].value);
        } else {
          setUserName("");
        }

        fetch("https://leetcode.com/graphql", {
          method: "POST",
          headers,
          body: CHALLENGE_QUERY,
        })
          .then((r) => r.json())
          .then((result) => {
            const challenge = result.data.activeDailyCodingChallengeQuestion;
            setStatus(challenge.userStatus);
            setProblem(challenge.question.title);
            setProblemLink("https://leetcode.com" + challenge.link);
            setProblemDifficulty(challenge.question.difficulty);
            setTopicTags(challenge.question.topicTags.map((t) => t.name));
          })
          .catch(() => setStatus("Error"));

        fetch("https://leetcode.com/graphql", {
          method: "POST",
          headers,
          body: USER_QUERY,
        })
          .then((r) => r.json())
          .then((result) => {
            setUserName(result.data.userStatus.username);
            setProfileLink(
              "https://leetcode.com/" + result.data.userStatus.username
            );
          })
          .catch(() => {});

        fetch("https://leetcode.com/graphql", {
          method: "POST",
          headers,
          body: STREAK_QUERY,
        })
          .then((r) => r.json())
          .then((result) => {
            if (result.data.streakCounter) {
              setStreak(result.data.streakCounter.streakCount);
            }
          })
          .catch(() => {});
      }
    );
  }, []);

  return (
    <Container fluid className="px-3 py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center">
          <img
            src="/Recap.png"
            width="32"
            height="32"
            alt="Recap logo"
            className="me-2"
          />
          <div className="fw-bold fs-5">Recap</div>
        </div>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          ⚙ Settings
        </Button>
      </div>

      {/* LeetCode */}
      <PlatformCard
        title="LeetCode"
        subtitle={
          userName ? (
            <>
              Signed in as{" "}
              <ExternalLink href={profileLink} className="text-decoration-none">
                {userName}
              </ExternalLink>
            </>
          ) : (
            "Daily Challenge"
          )
        }
        badge={
          streak !== null && (
            <Badge bg="warning" text="dark" className="fs-6">
              🔥 {streak} day{streak === 1 ? "" : "s"}
            </Badge>
          )
        }
      >
        {userName === "" && (
          <Alert variant="warning" className="py-2 mb-2 small">
            Not signed in.{" "}
            <ExternalLink href="https://leetcode.com">Sign in here</ExternalLink>
          </Alert>
        )}

        {status === "Loading" && (
          <Checking text="Checking today's challenge..." />
        )}

        {status === "NotStart" && (
          <Alert variant="danger" className="mb-0 py-2">
            <div className="fw-bold small mb-1">
              Today's challenge isn't done yet.
            </div>
            <ExternalLink
              href={problemLink}
              className="fw-bold text-decoration-none"
            >
              {problem}
            </ExternalLink>
            <QuestionDifficulty difficulty={problemDifficulty} />
            <TopicTags topicTags={topicTags} />
          </Alert>
        )}

        {status === "Finish" && (
          <Alert variant="success" className="mb-0 py-2">
            <div className="fw-bold small">✓ Challenge completed!</div>
            <small>Come back tomorrow for the next one.</small>
          </Alert>
        )}

        {status === "Error" && (
          <Alert variant="danger" className="mb-0 py-2">
            <div className="fw-bold small">Something went wrong.</div>
            <small>Couldn't fetch today's challenge status.</small>
          </Alert>
        )}
      </PlatformCard>

      {/* Codeforces */}
      <PlatformCard
        title="Codeforces"
        subtitle={
          cfHandle ? (
            <ExternalLink
              href={`https://codeforces.com/profile/${cfHandle}`}
              className="text-decoration-none"
            >
              {cfHandle}
            </ExternalLink>
          ) : (
            "Daily solving streak"
          )
        }
        badge={
          cfStreak && (
            <Badge
              bg={cfStreak.solvedToday ? "success" : "secondary"}
              className="fs-6"
            >
              {cfStreak.solvedToday ? "🔥" : "⏳"} {cfStreak.streak} day
              {cfStreak.streak === 1 ? "" : "s"}
            </Badge>
          )
        }
      >
        {cfHandle === "" && (
          <div className="text-muted small">
            Add your handle in{" "}
            <button
              type="button"
              className="btn btn-link btn-sm p-0 align-baseline"
              onClick={() => chrome.runtime.openOptionsPage()}
            >
              Settings
            </button>{" "}
            to track your streak.
          </div>
        )}

        {cfHandle && !cfStreak && !cfError && (
          <Checking text="Checking submissions..." />
        )}

        {cfStreak && (
          <Alert
            variant={cfStreak.solvedToday ? "success" : "warning"}
            className="mb-0 py-2"
          >
            <div className="fw-bold small">
              {cfStreak.solvedToday
                ? "✓ Solved something today!"
                : "⏳ No accepted submission today."}
            </div>
            <small>
              {cfStreak.solvedToday
                ? "Keep the streak going tomorrow."
                : "Solve one problem to keep your streak alive."}
            </small>
          </Alert>
        )}

        {cfError && (
          <Alert variant="danger" className="mb-0 py-2">
            <div className="fw-bold small">Codeforces unavailable.</div>
            <small>Check the handle in Settings, or try again later.</small>
          </Alert>
        )}
      </PlatformCard>
    </Container>
  );
}

render(<Popup />, document.getElementById("react-target"));
