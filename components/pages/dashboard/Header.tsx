interface HeaderProps {
  username: string;
}

const Header = ({ username }: HeaderProps) => {
  return (
    <section>
      <h1 className="text-2xl md:text-4xl font-bold">
        Welcome back, {username}.
      </h1>
      <p className="text-gray-500 mt-2">
        Select a workspace to continue your projects or start something new.
      </p>
    </section>
  );
};

export default Header;
