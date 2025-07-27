import * as React from "react";
import TextField from "@mui/material/TextField";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef(({ className, rows = 4, ...props }, ref) => (
  <TextField
    inputRef={ref}
    multiline
    rows={rows}
    variant="outlined"
    className={cn(className)}
    fullWidth
    {...props}
  />
));

Textarea.displayName = "Textarea";

export { Textarea };
