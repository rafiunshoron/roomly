
import { Link } from "react-router-dom";

function RoomCard({ room }) {
  return (
    <div
      style={{
        background: "white",
        color: "#1e293b",
        padding: "24px",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
      }}
    >
      <h2>{room.name}</h2>
      <p>{room.description}</p>
      <p>Capacity: {room.capacity} people</p>
      <h3>৳{room.hourly_rate} / hour</h3>

      <Link to={`/rooms/${room.id}`}>
        View Details
      </Link>
    </div>
  );
}

export default RoomCard;
