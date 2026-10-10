
import { useEffect, useState } from "react";
import {
  Link,
  useParams,
  useNavigate,
} from "react-router-dom";

import { api, getToken } from "../api.js";

function RoomDetails() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // =====================================
  // REACT STATE
  // =====================================

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const [available, setAvailable] = useState(null);
  const [checking, setChecking] = useState(false);
  const [booking, setBooking] = useState(false);

  const [error, setError] = useState("");

  // =====================================
  // FETCH ROOM DETAILS
  // =====================================

  useEffect(() => {
    let active = true;

    async function fetchRoom() {
      setLoading(true);
      setRoom(null);
      setError("");
      setAvailable(null);

      try {
        const data = await api(`/api/rooms/${roomId}`);

        if (active) {
          setRoom(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchRoom();

    return () => {
      active = false;
    };
  }, [roomId]);

  // =====================================
  // VALIDATE SELECTED DATE AND TIME
  // =====================================

  function getTimeRange() {
    if (!startAt || !endAt) {
      throw new Error(
        "Please select both start and end times."
      );
    }

    const start = new Date(startAt);
    const end = new Date(endAt);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      throw new Error("Invalid date or time.");
    }

    if (end <= start) {
      throw new Error(
        "End time must be after start time."
      );
    }

    if (start <= new Date()) {
      throw new Error(
        "Please select a future date and time."
      );
    }

    return {
      start_at: start.toISOString(),
      end_at: end.toISOString(),
    };
  }

  // =====================================
  // CHECK ROOM AVAILABILITY
  // =====================================

  async function checkAvailability() {
    setError("");
    setAvailable(null);
    setChecking(true);

    try {
      const range = getTimeRange();

      const params = new URLSearchParams(range);

      const result = await api(
        `/api/rooms/${roomId}/availability?${params}`
      );

      setAvailable(result.available);
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  // =====================================
  // BOOK ROOM
  // =====================================

  async function bookRoom() {
    // User must be logged in
    if (!getToken()) {
      navigate("/login", {
        state: {
          from: `/rooms/${roomId}`,
        },
      });
      return;
    }

    setError("");

    if (available !== true) {
      setError(
        "Please check room availability first."
      );
      return;
    }

    setBooking(true);

    try {
      const range = getTimeRange();

      const result = await api("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          room_id: Number(roomId),
          ...range,
        }),
      });

      if (result.status === "confirmed") {
        navigate("/my-bookings");
      }
    } catch (err) {
      setError(err.message);

      // Availability may have changed
      setAvailable(null);
    } finally {
      setBooking(false);
    }
  }

  // =====================================
  // LOADING AND ERROR STATES
  // =====================================

  if (loading) {
    return (
      <div style={{ padding: "30px" }}>
        <p>Loading room details...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ padding: "30px" }}>
        <p style={{ color: "red" }}>
          {error || "Room not found."}
        </p>

        <Link to="/rooms">
          Back to Rooms
        </Link>
      </div>
    );
  }

  // =====================================
  // ROOM DETAILS INTERFACE
  // =====================================

  return (
    <div
      style={{
        padding: "30px",
        maxWidth: "650px",
        margin: "auto",
      }}
    >
      <Link to="/rooms">
        ← Back to Rooms
      </Link>

      <h1>{room.name}</h1>

      <p>{room.description}</p>

      <p>
        Capacity: {room.capacity} people
      </p>

      <h2>
        ৳{room.hourly_rate} / hour
      </h2>

      <hr />

      <h2>Book This Room</h2>

      {/* START TIME */}

      <label htmlFor="start-time">
        Start Date and Time
      </label>

      <input
        id="start-time"
        type="datetime-local"
        value={startAt}
        disabled={checking || booking}
        onChange={(e) => {
          setStartAt(e.target.value);
          setAvailable(null);
          setError("");
        }}
      />

      {/* END TIME */}

      <label htmlFor="end-time">
        End Date and Time
      </label>

      <input
        id="end-time"
        type="datetime-local"
        value={endAt}
        disabled={checking || booking}
        onChange={(e) => {
          setEndAt(e.target.value);
          setAvailable(null);
          setError("");
        }}
      />

      <br />

      {/* CHECK AVAILABILITY */}

      <button
        onClick={checkAvailability}
        disabled={checking || booking}
      >
        {checking
          ? "Checking..."
          : "Check Availability"}
      </button>

      {/* AVAILABILITY RESULT */}

      {available === true && (
        <p style={{ color: "green" }}>
          ✅ Room is available!
        </p>
      )}

      {available === false && (
        <p style={{ color: "red" }}>
          ❌ Room is already booked
          for the selected time.
        </p>
      )}

      {/* ERROR MESSAGE */}

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      <br />

      {/* BOOK NOW */}

      <button
        onClick={bookRoom}
        disabled={
          checking ||
          booking ||
          available !== true
        }
        style={{
          marginTop: "15px",
          backgroundColor: "#2563eb",
          color: "white",
          padding: "12px 24px",
          border: "none",
          borderRadius: "8px",
          cursor:
            checking || booking || available !== true
              ? "not-allowed"
              : "pointer",
        }}
      >
        {booking
          ? "Booking..."
          : "Book Now"}
      </button>
    </div>
  );
}

export default RoomDetails;
