"use client";
import { 
  // Box, 
  Pagination, 
} from "@mui/material";
import PropTypes from "prop-types";

const PaginationControl = ({
  totalPages,
  currentPage,
  onPageChange,
  color = "secondary",
  variant = "outlined"
}) => {
  return (
    <>
    {/* <Box display="flex" justifyContent="center" alignItems="center" mt={2}> */}
        <Pagination
          showFirstButton
          showLastButton
          count={totalPages} // Total number of pages
          page={currentPage} // Current page
          onChange={onPageChange} // Handle page change
          variant={variant}
          color={color}
        />
    {/* </Box> */}
    </>
  );
};

PaginationControl.propTypes = {
  totalPages: PropTypes.number.isRequired,
  currentPage: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  color: PropTypes.string,
  variant: PropTypes.string,
};

export default PaginationControl;
