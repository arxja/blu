interface HeaderProps {
  username: string;
}

const Header = ({ username }: HeaderProps) => {
  return (
    <section>
      <h1 className="text-2xl font-bold text-text-primary md:text-4xl">
        Welcome back, {username}.
      </h1>
      <p className="mt-2 text-sm text-text-tertiary md:text-base">
        Select a workspace to continue your projects or start something new.
      </p>
    </section>
  );
};

export default Header;
