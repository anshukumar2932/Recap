import React, { useEffect, useState } from "react";
import { render } from "react-dom";
import { Alert, Button, Card, Container, Form } from "react-bootstrap";

import "bootstrap/dist/css/bootstrap.min.css";

// Detect the user's own timezone instead of assuming IST
const USER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

const DEFAULT_SETTINGS = {
  remindersEnabled: true,
  retryInterval: 30,
  notificationsEnabled: true,
  codeforcesEnabled: false,
  codeforcesHandle: "",
  dailyCheckHourUTC: 0,   // defaults to 00:00 UTC, same as before
  dailyCheckMinuteUTC: 0,
};

// Convert a UTC hour/minute into a "HH:MM" string in the user's local time,
// for pre-filling the <input type="time"> control.
function utcToLocalTimeString(hourUTC, minuteUTC) {
  const d = new Date();
  d.setUTCHours(hourUTC, minuteUTC, 0, 0);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: USER_TZ,
  }).format(d);
}

// Convert a local "HH:MM" (as typed into the time input, in the user's own
// timezone) into UTC hour/minute for storage — this is what background.js
// actually schedules against.
function localTimeStringToUTC(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const local = new Date(
    `${now.toISOString().slice(0, 10)}T${timeStr}:00`
  );
  // Reconstruct using the browser's own offset for USER_TZ by round-tripping
  // through the same local date components; since Date parsing above used
  // the browser's local timezone by default, and USER_TZ *is* the browser's
  // timezone, this is already correct — no extra conversion needed.
  return { hourUTC: local.getUTCHours(), minuteUTC: local.getUTCMinutes() };
}

function SectionCard({ icon, title, description, children }) {
  return (
    <Card className="mb-3 shadow-sm border-0">
      <Card.Body>
        <div className="d-flex align-items-center mb-2">
          <span className="fs-5 me-2">{icon}</span>
          <Card.Title className="mb-0">{title}</Card.Title>
        </div>
        {description && (
          <Card.Text className="text-muted small mb-3">{description}</Card.Text>
        )}
        {children}
      </Card.Body>
    </Card>
  );
}

function Settings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [localTime, setLocalTime] = useState("05:30");

  useEffect(() => {
    chrome.storage.local.get(DEFAULT_SETTINGS, (data) => {
      const loaded = {
        remindersEnabled: data.remindersEnabled,
        retryInterval: Number(data.retryInterval),
        notificationsEnabled: data.notificationsEnabled,
        codeforcesEnabled: !!data.codeforcesEnabled,
        codeforcesHandle: data.codeforcesHandle || "",
        dailyCheckHourUTC: Number(data.dailyCheckHourUTC),
        dailyCheckMinuteUTC: Number(data.dailyCheckMinuteUTC),
      };
      setSettings(loaded);
      setLocalTime(
        utcToLocalTimeString(loaded.dailyCheckHourUTC, loaded.dailyCheckMinuteUTC)
      );
    });
  }, []);

  const updateSetting = (key, value) => {
    setSettings((previous) => ({ ...previous, [key]: value }));
    setSaved(false);
  };

  const handleLocalTimeChange = (timeStr) => {
    setLocalTime(timeStr);
    const { hourUTC, minuteUTC } = localTimeStringToUTC(timeStr);
    setSettings((previous) => ({
      ...previous,
      dailyCheckHourUTC: hourUTC,
      dailyCheckMinuteUTC: minuteUTC,
    }));
    setSaved(false);
  };

  const saveSettings = () => {
    chrome.storage.local.set(settings, () => {
      if (chrome.runtime.lastError) {
        console.error("Failed to save settings:", chrome.runtime.lastError);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  };

  return (
    <Container style={{ maxWidth: "560px" }} className="px-3 py-4">
      <div className="d-flex align-items-center mb-4">
        <img src="/Recap.png" width="28" height="28" alt="Recap logo" className="me-2" />
        <span className="fw-bold fs-5">Recap Settings</span>
      </div>

      {saved && (
        <Alert variant="success" className="py-2">
          Settings saved successfully.
        </Alert>
      )}

      <SectionCard
        icon="🔔"
        title="Reminders"
        description="Get notified about the LeetCode Daily Challenge."
      >
        <Form.Check
          type="switch"
          id="remindersEnabled"
          label="Enable daily reminders"
          checked={settings.remindersEnabled}
          onChange={(e) => updateSetting("remindersEnabled", e.target.checked)}
        />
        <Form.Check
          type="switch"
          id="notificationsEnabled"
          label="Show Chrome notifications"
          className="mt-2"
          checked={settings.notificationsEnabled}
          onChange={(e) => updateSetting("notificationsEnabled", e.target.checked)}
        />

        <hr className="my-3" />

        <Form.Group className="mb-3">
          <Form.Label className="small text-muted mb-1">
            First daily check ({USER_TZ})
          </Form.Label>
          <Form.Control
            type="time"
            size="sm"
            value={localTime}
            onChange={(e) => handleLocalTimeChange(e.target.value)}
            disabled={!settings.remindersEnabled}
          />
          <div className="small text-muted mt-1">
            {String(settings.dailyCheckHourUTC).padStart(2, "0")}:
            {String(settings.dailyCheckMinuteUTC).padStart(2, "0")} UTC
          </div>
        </Form.Group>

        <Form.Group>
          <Form.Label className="small text-muted mb-1">
            Retry interval if today's challenge is incomplete
          </Form.Label>
          <Form.Select
            size="sm"
            value={settings.retryInterval}
            onChange={(e) => updateSetting("retryInterval", Number(e.target.value))}
            disabled={!settings.remindersEnabled}
          >
            <option value={15}>Every 15 minutes</option>
            <option value={30}>Every 30 minutes</option>
            <option value={60}>Every 1 hour</option>
            <option value={120}>Every 2 hours</option>
          </Form.Select>
        </Form.Group>
      </SectionCard>

      <SectionCard
        icon="🔵"
        title="Codeforces"
        description="Track and get reminded about your daily solving streak."
      >
        <Form.Check
          type="switch"
          id="codeforcesEnabled"
          label="Enable Codeforces streak tracking"
          checked={settings.codeforcesEnabled}
          onChange={(e) => updateSetting("codeforcesEnabled", e.target.checked)}
        />

        <Form.Group className="mt-3">
          <Form.Label className="small text-muted mb-1">Handle</Form.Label>
          <Form.Control
            type="text"
            size="sm"
            placeholder="e.g. tourist"
            value={settings.codeforcesHandle}
            disabled={!settings.codeforcesEnabled}
            onChange={(e) => updateSetting("codeforcesHandle", e.target.value.trim())}
          />
        </Form.Group>

        {settings.codeforcesEnabled && !settings.codeforcesHandle && (
          <div className="small text-warning mt-2">
            Enter a handle to start tracking your streak.
          </div>
        )}
      </SectionCard>

      <div className="d-flex justify-content-end">
        <Button variant="primary" onClick={saveSettings}>
          Save Settings
        </Button>
      </div>
    </Container>
  );
}

render(<Settings />, document.getElementById("react-target"));