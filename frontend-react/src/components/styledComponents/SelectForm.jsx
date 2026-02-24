import * as React from 'react';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

export default function SelectForm({ labelText, options, onChange, selected}) {
  const [selectedValue, setSelectedValue] = React.useState(selected || "");
  const label = labelText || ""

  const handleChange = (event) => {
    const value = event.target.value;
    setSelectedValue(value);
    if (onChange) {
      onChange(value); // Emit the selected value to the parent component
    }
  };
  return (
      <FormControl fullWidth size='small'>
        <InputLabel id="demo-simple-select-label">{`${label}`}</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={selectedValue}
          label={label}
          onChange={handleChange}
        >
          {
            options && options.map((option, index) => (
              <MenuItem key={index} value={option.value}>
                {option.label}
              </MenuItem>
            ))
          }
          {/* <MenuItem value={10}>Ten</MenuItem> */}
        </Select>
      </FormControl>
  );
}
