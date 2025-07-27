import * as React from "react";
import MuiButton from "@mui/material/Button";

import { cn } from "@/lib/utils";

const Button = React.forwardRef(({ className, variant = "contained", size = "medium", ...props }, ref) => (
  <MuiButton ref={ref} variant={variant} size={size} className={cn(className)} {...props} />
));

Button.displayName = "Button";

export { Button };
