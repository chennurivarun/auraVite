import * as React from "react";
import TextField from "@mui/material/TextField";

import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <TextField
    inputRef={ref}
    type={type}
    variant="outlined"
    className={cn(className)}
    fullWidth
    {...props}
  />
));

Input.displayName = "Input";

export { Input };
