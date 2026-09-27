import React, { useState, useEffect } from "react";
import { render } from "react-dom";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import { Navbar } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Chevron from "react-chevron";

import "bootstrap/dist/css/bootstrap.min.css";

function QuestionDifficulty({ difficulty }) {
  return (
    <Container>
      &emsp;&nbsp;Question Difficulty: <b>&nbsp;{difficulty}</b>
    </Container>
  );
}

function TopicTags({ topicTags }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Container>
      <div onClick={() => setExpanded(!expanded)} style={{ cursor: "pointer" }}>
        <Chevron direction={expanded ? "down" : "right"} /> Topic Tags
      </div>
      {expanded && (
        <ul>
          {topicTags.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
      )}
    </Container>
  );
}

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

function Popup() {
  const [status, setStatus] = useState("Loading"); // Loading | NotStart | Finish | Error
  const [problem, setProblem] = useState("");
  const [problemDifficulty, setProblemDifficulty] = useState("");
  const [topicTags, setTopicTags] = useState([]);
  const [problemLink, setProblemLink] = useState("");
  const [userName, setUserName] = useState(null);
  const [profileLink, setProfileLink] = useState("");
  const [streak, setStreak] = useState(null);

  useEffect(() => {
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
            setProfileLink("https://leetcode.com/" + result.data.userStatus.username);
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
    <Container>
      <Navbar>
        <Navbar.Brand>
          <img src="/Recap.png" width="30" height="30" alt="Recap logo" />
        </Navbar.Brand>
        <Navbar.Brand href="#home">Daily-Challenge Reminder</Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse className="justify-content-end">
          {streak !== null && (
            <Navbar.Text className="me-3">
              🔥 {streak} day{streak === 1 ? "" : "s"}
            </Navbar.Text>
          )}

          {userName ? (
            <Navbar.Text className="me-3">
              Signed in as:{" "}
              <a href={profileLink} target="_blank" rel="noreferrer">
                {userName}
              </a>
            </Navbar.Text>
          ) : (
            userName === "" && (
              <Navbar.Text className="me-3">
                Please Sign-in{" "}
                <a href="https://leetcode.com" target="_blank" rel="noreferrer">
                  here
                </a>
              </Navbar.Text>
            )
          )}

          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            Settings
          </Button>
        </Navbar.Collapse>
      </Navbar>

      {status === "Loading" && (
        <Container>
          <center>
            <h3>Loading...</h3>
          </center>
        </Container>
      )}

      {status === "NotStart" && (
        <Alert variant="danger">
          <h4>You haven't completed today's challenge!</h4>
          <p>
            <b>Today's Problem: &emsp;</b>
            <a href={problemLink} target="_blank" rel="noreferrer">
              {problem}
            </a>
          </p>
          <QuestionDifficulty difficulty={problemDifficulty} />
          <TopicTags topicTags={topicTags} />
        </Alert>
      )}

      {status === "Finish" && (
        <Alert variant="success">
          <h4>Good Job! You've already completed today's question!</h4>
          <h6>Come back tomorrow for another one :)</h6>
        </Alert>
      )}

      {status === "Error" && (
        <Alert variant="danger">
          <h4>Oh no!</h4>
          <h6>Something went wrong fetching your challenge status.</h6>
        </Alert>
      )}
    </Container>
  );
}

render(<Popup />, document.getElementById("react-target"));
