import React, { createContext, ReactNode, useContext, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface AlertOptions {
    title: string;
    message?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    isConfirm?: boolean;
}

interface AlertContextType {
    showAlert: (title: string, message?: string, onConfirm?: () => void) => void;
    showConfirm: (
        title: string,
        message: string,
        onConfirm: () => void,
        onCancel?: () => void,
        confirmText?: string,
        cancelText?: string
    ) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

// Global reference for the alert utility
let globalAlertRef: AlertContextType | null = null;

export const getGlobalAlert = () => globalAlertRef;

export const AlertProvider = ({ children }: { children: ReactNode }) => {
    const [visible, setVisible] = useState(false);
    const [options, setOptions] = useState<AlertOptions>({ title: '' });
    const [fadeAnim] = useState(new Animated.Value(0));

    const show = (opts: AlertOptions) => {
        setOptions(opts);
        setVisible(true);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
    };

    const hide = (callback?: () => void) => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setVisible(false);
            if (callback) callback();
        });
    };

    const alertContext: AlertContextType = {
        showAlert: (title, message, onConfirm) => {
            show({ title, message, onConfirm, isConfirm: false });
        },
        showConfirm: (title, message, onConfirm, onCancel, confirmText, cancelText) => {
            show({
                title,
                message,
                onConfirm,
                onCancel,
                confirmText,
                cancelText,
                isConfirm: true,
            });
        },
    };

    globalAlertRef = alertContext;

    const handleConfirm = () => {
        hide(() => {
            if (options.onConfirm) options.onConfirm();
        });
    };

    const handleCancel = () => {
        hide(() => {
            if (options.onCancel) options.onCancel();
        });
    };

    return (
        <AlertContext.Provider value={alertContext}>
            {children}
            <Modal
                transparent
                visible={visible}
                animationType="none"
                onRequestClose={() => hide()}
            >
                <View style={styles.overlay}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />

                    <Animated.View style={[styles.modalContainer, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
                        <View style={styles.content}>
                            <Text style={styles.title}>{options.title}</Text>
                            {options.message ? (
                                <Text style={styles.message}>{options.message}</Text>
                            ) : null}
                        </View>

                        <View style={styles.buttonRow}>
                            {options.isConfirm && (
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton]}
                                    onPress={handleCancel}
                                >
                                    <Text style={styles.cancelButtonText}>
                                        {options.cancelText || 'Cancel'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.button, styles.confirmButton, !options.isConfirm && { borderLeftWidth: 0, borderBottomLeftRadius: 16 }]}
                                onPress={handleConfirm}
                            >
                                <Text style={styles.confirmButtonText}>
                                    {options.confirmText || 'OK'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </AlertContext.Provider>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: Math.min(Dimensions.get('window').width * 0.85, 340),
        backgroundColor: '#fff',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        overflow: 'hidden',
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
    buttonRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    button: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButton: {
        borderLeftWidth: 1,
        borderLeftColor: '#f0f0f0',
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#00b679',
    },
    cancelButton: {},
    cancelButtonText: {
        fontSize: 16,
        color: '#FF3B30',
        fontWeight: '500',
    },
});
