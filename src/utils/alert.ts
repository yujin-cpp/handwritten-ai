import { getGlobalAlert } from "../components/AlertProvider";

/**
 * A cross-platform alert utility that uses our custom Modal AlertProvider.
 */
export const showAlert = (
    title: string,
    message?: string,
    onPress?: () => void
) => {
    const alert = getGlobalAlert();
    if (alert) {
        alert.showAlert(title, message, onPress);
    } else {
        // Fallback if provider isn't ready
        console.warn("AlertProvider not found. Falling back to window.alert.");
        window.alert(`${title}\n\n${message || ""}`);
        if (onPress) onPress();
    }
};

/**
 * Support for alert with multiple buttons (like Confirm/Cancel)
 */
export const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText = "OK",
    cancelText = "Cancel"
) => {
    const alert = getGlobalAlert();
    if (alert) {
        alert.showConfirm(title, message, onConfirm, onCancel, confirmText, cancelText);
    } else {
        // Fallback if provider isn't ready
        if (window.confirm(`${title}\n\n${message}`)) {
            onConfirm();
        } else if (onCancel) {
            onCancel();
        }
    }
};
