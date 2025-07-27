"use client";

import * as React from "react";
import {
  Dialog as MuiDialog,
  DialogTitle as MuiDialogTitle,
  DialogContent as MuiDialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";

import { cn } from "@/lib/utils";

const DialogContext = React.createContext({ onOpen: () => {}, onClose: () => {} });

const Dialog = ({ open, onOpenChange, children, ...props }) => {
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
    <DialogContext.Provider value={{ onOpen: handleOpen, onClose: handleClose }}>
      <MuiDialog open={isOpen} onClose={handleClose} {...props}>
        {children}
      </MuiDialog>
    </DialogContext.Provider>
  );
};

const DialogTrigger = React.forwardRef(({ asChild, children, ...props }, ref) => {
  const { onOpen } = React.useContext(DialogContext);
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

DialogTrigger.displayName = "DialogTrigger";

const DialogContent = ({ className, ...props }) => (
  <MuiDialogContent className={cn(className)} {...props} />
);

const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);

const DialogFooter = ({ className, ...props }) => (
  <DialogActions className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <MuiDialogTitle ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
));

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogContentText ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
