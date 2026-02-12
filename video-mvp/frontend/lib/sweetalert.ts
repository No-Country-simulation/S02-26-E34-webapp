import Swal, { SweetAlertIcon, SweetAlertResult } from 'sweetalert2';

/**
 * Show a success message
 */
export const showSuccess = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'success' as SweetAlertIcon,
    title,
    text,
    confirmButtonText: 'Aceptar',
    confirmButtonColor: '#10B981',
  });
};

/**
 * Show an error message
 */
export const showError = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'error' as SweetAlertIcon,
    title,
    text,
    confirmButtonText: 'Cerrar',
    confirmButtonColor: '#EF4444',
  });
};

/**
 * Show an info message
 */
export const showInfo = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'info' as SweetAlertIcon,
    title,
    text,
    confirmButtonText: 'Aceptar',
    confirmButtonColor: '#3B82F6',
  });
};

/**
 * Show a warning message
 */
export const showWarning = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'warning' as SweetAlertIcon,
    title,
    text,
    confirmButtonText: 'Aceptar',
    confirmButtonColor: '#F59E0B',
  });
};

/**
 * Show a confirmation dialog
 */
export const showConfirmation = (title: string, text?: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'question' as SweetAlertIcon,
    showCancelButton: true,
    confirmButtonText: 'Sí, continuar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#3B82F6',
    cancelButtonColor: '#9CA3AF',
  });
};

/**
 * Show a loading spinner
 */
export const showLoading = (title?: string) => {
  Swal.fire({
    title: title || 'Procesando...',
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

/**
 * Close the current modal
 */
export const closeAlert = () => {
  Swal.close();
};