import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Button from "./Button";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  itemLabel?: string;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

const PaginationControls = ({
  page,
  pageSize,
  totalItems,
  totalPages,
  itemLabel = "items",
  disabled = false,
  onPageChange,
}: PaginationControlsProps) => {
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <nav
      className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between"
      aria-label={`${itemLabel} pagination`}
    >
      <p className="text-xs text-gray-500">
        Showing{" "}
        <strong className="text-gray-700">
          {firstItem}-{lastItem}
        </strong>{" "}
        of <strong className="text-gray-700">{totalItems}</strong> {itemLabel}
      </p>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <Button
          variant="outline"
          size="sm"
          leadingIcon={<FaChevronLeft />}
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="text-xs font-semibold text-gray-600">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || totalPages === 0 || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <span aria-hidden="true">
            <FaChevronRight />
          </span>
        </Button>
      </div>
    </nav>
  );
};

export default PaginationControls;
