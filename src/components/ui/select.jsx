import * as React from "react";
import { Select as MuiSelect, MenuItem } from "@mui/material";

import { cn } from "@/lib/utils";

const Select = ({ className, value, onValueChange, children, ...props }) => (
  <MuiSelect
    className={cn(className)}
    value={value}
    onChange={(e) => onValueChange?.(e.target.value)}
    {...props}
  >
    {children}
  </MuiSelect>
);

const SelectContent = ({ children }) => <>{children}</>;

const SelectItem = ({ value, children, ...props }) => (
  <MenuItem value={value} {...props}>
    {children}
  </MenuItem>
);

const SelectTrigger = ({ children }) => <>{children}</>;

const SelectValue = () => null;

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
