# backend/utils/storage.py
import boto3
import os
from botocore.exceptions import ClientError
from typing import Optional
from config.settings import settings

class StorageService:
    def __init__(self):
        # Configurar cliente de almacenamiento (R2 o S3)
        self.bucket_name = os.getenv("CLOUDFLARE_R2_BUCKET_NAME") or os.getenv("AWS_S3_BUCKET_NAME")
        
        # Verificar si tenemos credenciales suficientes para inicializar el cliente
        cf_r2_endpoint = os.getenv("CLOUDFLARE_R2_ENDPOINT_URL")
        aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        
        # Solo inicializar cliente si tenemos credenciales
        if cf_r2_endpoint and os.getenv("CLOUDFLARE_R2_ACCESS_KEY_ID") and os.getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"):
            # Usar R2
            self.client = boto3.client(
                's3',
                endpoint_url=cf_r2_endpoint,
                aws_access_key_id=os.getenv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
                region_name='auto'  # R2 no requiere región específica
            )
            self.enabled = True
        elif aws_access_key and aws_secret_key and self.bucket_name:
            # Usar S3
            self.client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1")
            )
            self.enabled = True
        else:
            # No hay credenciales, usar modo simulado
            print("No se encontraron credenciales para almacenamiento en la nube. Usando modo simulado.")
            self.client = None
            self.enabled = False

    def upload_file(self, file_path: str, object_name: Optional[str] = None) -> bool:
        """Sube un archivo al bucket de almacenamiento"""
        if not self.enabled:
            # Modo simulado: copiar archivo localmente
            import shutil
            if object_name is None:
                object_name = os.path.basename(file_path)
            
            # Crear directorio temporal si no existe
            storage_path = settings.TMP_DIR
            dest_path = os.path.join(storage_path, object_name)
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            shutil.copy2(file_path, dest_path)
            print(f"Archivo copiado localmente a: {dest_path}")
            return True
            
        if object_name is None:
            object_name = os.path.basename(file_path)

        try:
            self.client.upload_file(file_path, self.bucket_name, object_name)
            return True
        except ClientError as e:
            print(f"Error al subir archivo: {e}")
            return False

    def download_file(self, object_name: str, file_path: str) -> bool:
        """Descarga un archivo desde el bucket de almacenamiento"""
        if not self.enabled:
            # Modo simulado: buscar archivo localmente
            storage_path = settings.TMP_DIR
            simulated_path = os.path.join(storage_path, object_name)
            if os.path.exists(simulated_path):
                import shutil
                shutil.copy2(simulated_path, file_path)
                print(f"Archivo descargado localmente desde: {simulated_path}")
                return True
            else:
                print(f"Archivo simulado no encontrado: {simulated_path}")
                return False
        
        try:
            self.client.download_file(self.bucket_name, object_name, file_path)
            return True
        except ClientError as e:
            print(f"Error al descargar archivo: {e}")
            return False

    def delete_file(self, object_name: str) -> bool:
        """Elimina un archivo del bucket de almacenamiento"""
        if not self.enabled:
            # Modo simulado: eliminar archivo localmente
            storage_path = settings.TMP_DIR
            simulated_path = os.path.join(storage_path, object_name)
            if os.path.exists(simulated_path):
                os.remove(simulated_path)
                print(f"Archivo simulado eliminado: {simulated_path}")
                return True
            else:
                print(f"Archivo simulado no encontrado para eliminar: {simulated_path}")
                return False
        
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=object_name)
            return True
        except ClientError as e:
            print(f"Error al eliminar archivo: {e}")
            return False

    def file_exists(self, object_name: str) -> bool:
        """Verifica si un archivo existe en el bucket"""
        if not self.enabled:
            # Modo simulado: verificar archivo localmente
            storage_path = settings.TMP_DIR
            simulated_path = os.path.join(storage_path, object_name)
            return os.path.exists(simulated_path)
        
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=object_name)
            return True
        except ClientError:
            return False

# Instancia global del servicio de almacenamiento
storage_service = StorageService()