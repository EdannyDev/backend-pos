🕹️POS Gamer - Backend

📌Descripción
Este es el backend del sistema POS Gamer, que provee las APIs necesarias para la gestión de inventario, ventas, usuarios y reportes.  

El sistema maneja dos roles principales:  
-Administrador: gestiona productos, ventas, usuarios y reportes.  
-Vendedor (Seller): gestiona ventas e inventario limitado.  

Incluye autenticación segura, encriptación de contraseñas, sesiones con cookies httpOnly y envío de notificaciones.  


🛠️Tecnologías utilizadas
-Node.js  
-Express (Framework para APIs REST)  
-MongoDB / Mongoose (Base de datos NoSQL y modelado de datos)  
-JWT (Autenticación segura)  
-bcryptjs (Encriptación de contraseñas)  
-cookie-parser (Manejo de sesiones con cookies httpOnly)  
-crypto (Tokens y seguridad)  
-dotenv (Variables de entorno)  
-CORS (Control de orígenes)  
-Nodemailer & Google APIs (Envío de correos electrónicos)  

⚙️Instalación y ejecución
1.-Clonar el repositorio:
git clone https://github.com/EdannyDev/backend-pos.git

2.-Instalar dependencias:
npm install

3.-Crear un archivo .env en la raíz del proyecto con las siguientes variables:
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/posDB
JWT_SECRET=your_jwt_secret_here
GMAIL_USER=your_email_here
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REFRESH_TOKEN=your_refresh_token_here
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground

4.-Ejecutar la aplicación:
npm start

5.-La API estará disponible en:
http://localhost:5000

✨Rutas principales
Usuarios - /api/users
Productos - /api/products
Ventas - /api/sales
Reportes - /api/reports

🔗Enlaces útiles
Frontend: https://github.com/EdannyDev/pos-app
