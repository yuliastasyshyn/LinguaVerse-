export default function WelcomeCard(){return (<div className="card wide">Welcome</div>);}import "./Card.css";

export default function WelcomeCard({ user }) {
  return (
    <div className="card wide">
      <h2>Welcome back, {user?.name}! 👋</h2>
      <p>Keep up your amazing progress. You're doing great!</p>
    </div>
  );
}
