import * as React from "react";
import {
  Dialog as MuiDialog,
  DialogTitle as MuiDialogTitle,
  DialogContent as MuiDialogContent,
  DialogContentText,
  DialogActions,
  Button as MuiButton,
} from "@mui/material";

import { cn } from "@/lib/utils";

const AlertDialogContext = React.createContext({ onOpen: () => {}, onClose: () => {} });

const AlertDialog = ({ open, onOpenChange, children, ...props }) => {
  const [isOpen, setIsOpen] = React.useState(open ?? false);

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const handleClose = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    onOpenChange?.(true);
  };

  return (
    <AlertDialogContext.Provider value={{ onOpen: handleOpen, onClose: handleClose }}>
      <MuiDialog open={isOpen} onClose={handleClose} {...props}>
        {children}
      </MuiDialog>
    </AlertDialogContext.Provider>
  );
};

const AlertDialogTrigger = React.forwardRef(({ asChild, children, ...props }, ref) => {
  const { onOpen } = React.useContext(AlertDialogContext);
  const child = React.Children.only(children);
  return React.cloneElement(child, {
    ref,
    onClick: (e) => {
      onOpen();
      child.props.onClick?.(e);
    },
    ...props,
  });
});

AlertDialogTrigger.displayName = "AlertDialogTrigger";

const AlertDialogContent = ({ className, ...props }) => (
  <MuiDialogContent className={cn(className)} {...props} />
);

const AlertDialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);

const AlertDialogFooter = ({ className, ...props }) => (
  <DialogActions className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);

const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <MuiDialogTitle ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
));

const AlertDialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogContentText ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));

const AlertDialogAction = React.forwardRef(({ className, ...props }, ref) => (
  <MuiButton ref={ref} className={cn(className)} {...props} />
));

const AlertDialogCancel = React.forwardRef(({ className, ...props }, ref) => (
  <MuiButton ref={ref} className={cn(className)} {...props} />
));

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
