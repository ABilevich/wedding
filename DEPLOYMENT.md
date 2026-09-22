# Publicar y ejecutar la invitación

Esta carpeta contiene una copia autónoma de la versión actual para mobile, tablet y desktop. `site/` incluye HTML, CSS, JavaScript, imágenes y fuentes locales. No requiere Node, npm, una base de datos ni servicios externos para funcionar.

## 1. Copiar al repositorio

Copia **el contenido** de esta carpeta a la raíz de tu repositorio existente, incluyendo `.github/` y `.dockerignore` (son archivos ocultos; en Finder se muestran con `Cmd + Shift + .`). Conserva tu README y tu `.gitignore`.

La estructura final debe ser:

```text
tu-repositorio/
├── README.md                  # el que ya tienes
├── .gitignore                 # el que ya tienes
├── .github/workflows/publish-image.yml
├── .dockerignore
├── Dockerfile
├── nginx.conf
├── DEPLOYMENT.md
└── site/
    ├── index.html
    ├── styles.css
    ├── script.js
    ├── landscape.css
    ├── landscape.js
    └── assets/
```

Desde la raíz del repositorio destino:

```sh
git add .github/workflows/publish-image.yml .dockerignore Dockerfile nginx.conf DEPLOYMENT.md site
git status
git commit -m "Add wedding site and Docker publishing workflow"
git push
```

El workflow debe estar en la **rama predeterminada** del repo para que aparezca el botón de ejecución manual. Revisa que tu `.gitignore` permita subir `site/` y sus recursos.

## 2. Construir y publicar la imagen

En GitHub, abre **Actions → Publicar imagen Docker → Run workflow**. Selecciona la rama que quieras publicar y confirma.

La Action construye una imagen de prueba, inicia Nginx y comprueba por HTTP la página y todos sus archivos. Si pasa, publica una imagen para **Linux AMD64 y ARM64** en GitHub Container Registry. La prueba de ejecución se realiza en AMD64.

El nombre se calcula automáticamente a partir del repositorio, en minúsculas:

```text
ghcr.io/propietario/repositorio:latest
ghcr.io/propietario/repositorio:sha-COMMIT_COMPLETO
```

Cada ejecución actualiza `latest` con la rama seleccionada. El resumen de la Action muestra también una referencia por digest y el comando exacto para ejecutarla.

Utiliza el `GITHUB_TOKEN` automático con permiso `packages: write`; no necesitas agregar un token personal como secret para publicar. El repositorio u organización debe permitir GitHub Actions y la publicación de paquetes. [Documentación de GitHub](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images).

## 3. Levantar el proyecto solo con la imagen

En cualquier equipo o servidor con Docker, reemplaza `propietario/repositorio` por el nombre que muestra la Action:

```sh
docker run -d \
  --name wedding \
  --restart unless-stopped \
  -p 8080:8080 \
  ghcr.io/propietario/repositorio:latest
```

Abre **http://localhost:8080** o **http://IP-DEL-SERVIDOR:8080**. La imagen lleva todo el sitio dentro: no hace falta clonar el repositorio ni montar carpetas. Sirve la web desde `/` y expone `/healthz` para comprobar su estado.

Si el paquete es privado, autentícate antes con una cuenta que tenga acceso. Ejecuta `docker login ghcr.io -u TU_USUARIO` y pega un **personal access token classic con `read:packages`** cuando pida la contraseña. También puedes cambiar la visibilidad del paquete a público desde GitHub Packages si deseas permitir descargas sin autenticación. [Acceso a GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

Para actualizar un contenedor existente después de publicar otra versión:

```sh
docker pull ghcr.io/propietario/repositorio:latest
docker stop wedding
docker rm wedding
docker run -d --name wedding --restart unless-stopped -p 8080:8080 ghcr.io/propietario/repositorio:latest
```

Para fijar una versión, usa la referencia por digest que entrega la Action en lugar de `:latest`.

La Action publica la imagen; el arranque se hace con el comando anterior en tu servidor. Dominio y HTTPS se configuran en el hosting o proxy que dirija el tráfico al puerto 8080.

## Probar sin GitHub

Con el motor de Docker encendido, desde esta carpeta:

```sh
docker build -t wedding:local .
docker run --rm -p 8080:8080 wedding:local
```

Nginx se ejecuta sin root usando [NGINX Unprivileged](https://github.com/nginx/docker-nginx-unprivileged). La base `stable-alpine` recibe actualizaciones al reconstruir con `--pull`. Las Actions están fijadas a commits específicos.

## Editar después

Modifica los archivos dentro de `site/`, haz push y vuelve a ejecutar la Action. Esta carpeta es una copia independiente; los cambios futuros en el proyecto original no se sincronizan automáticamente.
