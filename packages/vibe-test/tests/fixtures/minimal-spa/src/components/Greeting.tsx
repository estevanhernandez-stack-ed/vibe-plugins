interface GreetingProps {
  name: string;
  excited?: boolean;
}

export function Greeting({ name, excited = false }: GreetingProps) {
  return (
    <p className="greeting">
      Hello, {name}
      {excited ? '!' : '.'}
    </p>
  );
}

export default Greeting;
