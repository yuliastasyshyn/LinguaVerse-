export default function RoomsRecommended({ rooms = [] }) {
  const recommended = rooms.slice(0, 2); 

  return (
    <div className="card">
      <h3>Recommended Rooms</h3>

      {recommended.length === 0 && (
        <p>No rooms available</p>
      )}

      {recommended.map((room) => (
        <div key={room.id} className="room-block">
          <strong>{room.language}</strong>
          <p>{room.title}</p>

          <button
            onClick={() => (window.location.href = `/chat/${room.id}`)}
            className="join-btn"
          >
            Join
          </button>
        </div>
      ))}
    </div>
  );
}
