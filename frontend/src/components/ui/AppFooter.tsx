interface AppFooterProps {
  className?: string;
}

const AppFooter = ({ className = "" }: AppFooterProps) => {
  const currentYear: number = new Date().getFullYear();

  return (
    <footer className={`px-4 py-5 text-center text-xs text-gray-500 sm:text-sm ${className}`}>
      &copy; {currentYear} Taskforge. All rights reserved.
    </footer>
  );
};

export default AppFooter;
