/* Official National Emblem of India (State Emblem, Satyameva Jayate).
   Asset: public/gov/national-emblem.png (354x564 source). */
export default function Emblem({ height = 64, ...rest }) {
  return (
    <img
      src="/gov/national-emblem.png"
      alt="National Emblem of India"
      height={height}
      style={{ width: 'auto', display: 'block' }}
      {...rest}
    />
  );
}
