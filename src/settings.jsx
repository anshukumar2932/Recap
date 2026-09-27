import React, { useEffect, useState } from "react";
import { render } from "react-dom";
import {  Alert,  Button,  Card,  Container,  Form,  Navbar,} from "react-bootstrap";

import "bootstrap/dist/css/bootstrap.min.css";

const DEFAULT_SETTINGS = {
  remindersEnabled: true,
  retryInterval: 30,
  notificationsEnabled: true,
};

function Settings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(DEFAULT_SETTINGS, (data) => {
      setSettings({
        remindersEnabled: data.remindersEnabled,
        retryInterval: Number(data.retryInterval),
        notificationsEnabled: data.notificationsEnabled,
      });
    });
  }, []);

  const updateSetting = (key, value) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));

    setSaved(false);
  };

  const saveSettings = () => {
    chrome.storage.local.set(settings, () => {
      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    });
  };

  return (
    <Container style={{ maxWidth: "700px", paddingTop: "30px" }}>
      <Navbar className="mb-4">
        <Navbar.Brand>
          <img
            src="/Recap.png"
            width="30"
            height="30"
            alt="Recap logo"
            className="me-2"
            />
          Recap Settings
        </Navbar.Brand>
      </Navbar>

      {saved && (
        <Alert variant="success">
          Settings saved successfully.
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Reminder</Card.Title>
          <Card.Text className="text-muted">
            Configure how Recap reminds you about the LeetCode Daily Challenge.
          </Card.Text>

          <Form.Check
            type="switch"
            id="remindersEnabled"
            label="Enable daily reminders"
            checked={settings.remindersEnabled}
            onChange={(e) =>
              updateSetting("remindersEnabled", e.target.checked)
            }
          />
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Daily Check</Card.Title>

          <p className="text-muted">
            Recap performs the first Daily Challenge check at:
          </p>

          <div className="p-3 bg-light rounded">
            <strong>05:30 AM IST</strong>
            <br />
            <small className="text-muted">
              00:00 UTC
            </small>
          </div>

          <small className="text-muted d-block mt-2">
            The daily check time is currently fixed. Custom scheduling can be
            added later.
          </small>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Retry Interval</Card.Title>

          <Form.Group>
            <Form.Label>
              If today's challenge is incomplete
            </Form.Label>

            <Form.Select
              value={settings.retryInterval}
              onChange={(e) =>
                updateSetting("retryInterval", Number(e.target.value))
              }
            >
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 1 hour</option>
              <option value={120}>Every 2 hours</option>
            </Form.Select>
          </Form.Group>

          <small className="text-muted d-block mt-2">
            Recap stops retrying once today's challenge is completed.
          </small>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Notifications</Card.Title>

          <Form.Check
            type="switch"
            id="notificationsEnabled"
            label="Enable Chrome notifications"
            checked={settings.notificationsEnabled}
            onChange={(e) =>
              updateSetting("notificationsEnabled", e.target.checked)
            }
          />
        </Card.Body>
      </Card>

      <div className="d-flex justify-content-end mb-5">
        <Button variant="primary" onClick={saveSettings}>
          Save Settings
        </Button>
      </div>
    </Container>
  );
}

render(<Settings />, document.getElementById("react-target"));