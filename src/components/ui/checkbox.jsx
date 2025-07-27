import * as React from "react";
import MuiCheckbox from "@mui/material/Checkbox";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <MuiCheckbox ref={ref} className={cn(className)} {...props} />
));

Checkbox.displayName = "Checkbox";

export { Checkbox };
