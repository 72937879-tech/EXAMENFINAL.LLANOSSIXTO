/* =========================================================
   Facultad de Ciencias Sociales — script.js
   Funcionalidades: carrusel con pausa, contadores, botón subir,
   validación accesible del formulario y contador de caracteres.
   (Estructura de funciones inicializarX() tomada del PA3)
   ========================================================= */
'use strict';

const prefiereMenosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Carrusel: pausa/reproducción (WCAG 2.2.2) ---------- */
function inicializarCarrusel() {
  const elemento = document.getElementById('carrusel-hero');
  const boton = document.getElementById('boton-pausa');
  if (!elemento || !boton || typeof bootstrap === 'undefined') return;

  const carrusel = bootstrap.Carousel.getOrCreateInstance(elemento, { interval: 7000, ride: false, pause: 'hover' });
  let enPausa = prefiereMenosMovimiento; // si el usuario pide menos movimiento, no se reproduce solo

  const actualizarBoton = () => {
    boton.textContent = enPausa ? '▶ Reproducir' : '⏸ Pausar';
    boton.setAttribute('aria-pressed', String(enPausa));
    boton.setAttribute('aria-label', enPausa ? 'Reproducir carrusel automáticamente' : 'Pausar carrusel automático');
  };
  if (!enPausa) carrusel.cycle();
  actualizarBoton();

  boton.addEventListener('click', () => {
    enPausa = !enPausa;
    enPausa ? carrusel.pause() : carrusel.cycle();
    actualizarBoton();
  });
}

/* ---------- Contadores animados de cifras ---------- */
function inicializarContadores() {
  const numeros = document.querySelectorAll('[data-meta]');
  if (!numeros.length || prefiereMenosMovimiento || !('IntersectionObserver' in window)) return;

  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      const el = entrada.target;
      const meta = Number(el.dataset.meta);
      const sufijo = el.dataset.sufijo || '';
      const inicio = performance.now();
      const duracion = 1200;
      const paso = (ahora) => {
        const avance = Math.min((ahora - inicio) / duracion, 1);
        el.textContent = Math.round(meta * avance) + sufijo;
        if (avance < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
      observador.unobserve(el);
    });
  }, { threshold: 0.6 });
  numeros.forEach((n) => observador.observe(n));
}

/* ---------- Botón "volver arriba" ---------- */
function inicializarBotonSubir() {
  const boton = document.getElementById('boton-subir');
  if (!boton) return;
  window.addEventListener('scroll', () => boton.classList.toggle('visible', window.scrollY > 500), { passive: true });
  boton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefiereMenosMovimiento ? 'auto' : 'smooth' });
    document.getElementById('contenido-principal')?.focus({ preventScroll: true });
  });
}

/* ---------- Formulario de inscripción ---------- */
const REGLAS = {
  nombres:     { valido: (v) => v.trim().length >= 3 && /^[\p{L}\s.'-]+$/u.test(v.trim()) },
  dni:         { valido: (v) => /^\d{8}$/.test(v) },
  correo:      { valido: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) },
  celular:     { valido: (v) => /^9\d{8}$/.test(v) },
  procedencia: { valido: (v) => v !== '' },
  acepto:      { valido: (_v, el) => el.checked },
};

function marcarCampo(control, esValido) {
  control.classList.toggle('is-invalid', !esValido);
  control.classList.toggle('is-valid', esValido);
  control.setAttribute('aria-invalid', String(!esValido));
}

function validarCampo(control) {
  const regla = REGLAS[control.name];
  if (!regla) return true;
  const ok = regla.valido(control.value, control);
  marcarCampo(control, ok);
  return ok;
}

function validarModalidad(form) {
  const radios = form.querySelectorAll('input[name="modalidad"]');
  const ok = [...radios].some((r) => r.checked);
  radios.forEach((r) => { r.classList.toggle('is-invalid', !ok); r.setAttribute('aria-invalid', String(!ok)); });
  return ok;
}

function inicializarFormulario() {
  const form = document.getElementById('form-inscripcion');
  if (!form) return;
  const resumen = document.getElementById('resumen-errores');
  const exito = document.getElementById('mensaje-exito');
  const contador = document.getElementById('mensaje-contador');
  const mensaje = document.getElementById('mensaje');

  // Solo números en DNI y celular (retroalimentación inmediata)
  ['dni', 'celular'].forEach((id) => {
    const campo = form.elements[id];
    campo.addEventListener('input', () => { campo.value = campo.value.replace(/\D/g, ''); });
  });

  // Validación al salir del campo (blur) y corrección en vivo si ya hubo error
  form.querySelectorAll('input:not([type=radio]), select').forEach((control) => {
    control.addEventListener('blur', () => { if (control.value !== '' || control.classList.contains('is-invalid')) validarCampo(control); });
    control.addEventListener('input', () => { if (control.classList.contains('is-invalid')) validarCampo(control); });
    control.addEventListener('change', () => { if (control.type === 'checkbox' || control.tagName === 'SELECT') validarCampo(control); });
  });
  form.querySelectorAll('input[name="modalidad"]').forEach((r) => r.addEventListener('change', () => validarModalidad(form)));

  mensaje.addEventListener('input', () => { contador.textContent = `${mensaje.value.length} de 300 caracteres`; });

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    exito.classList.add('d-none');

    const etiquetas = { nombres: 'Nombres y apellidos', dni: 'DNI', correo: 'Correo electrónico', celular: 'Celular', procedencia: 'Institución de procedencia', acepto: 'Aceptación de datos' };
    const errores = [];
    Object.keys(REGLAS).forEach((nombre) => {
      const control = form.elements[nombre];
      if (!validarCampo(control)) errores.push({ id: control.id, texto: etiquetas[nombre] });
    });
    if (!validarModalidad(form)) errores.push({ id: 'mod-ordinario', texto: 'Modalidad de ingreso' });

    if (errores.length) {
      resumen.innerHTML = `<strong>Revisa ${errores.length} campo${errores.length > 1 ? 's' : ''} antes de enviar:</strong><ul class="mb-0">` +
        errores.map((e) => `<li><a href="#${e.id}" class="alert-link">${e.texto}</a></li>`).join('') + '</ul>';
      resumen.classList.remove('d-none');
      resumen.focus();
      return;
    }

    resumen.classList.add('d-none');
    const nombre = form.elements.nombres.value.trim().split(/\s+/)[0];
    exito.innerHTML = `<strong>¡Gracias, ${nombre}!</strong> Recibimos tu inscripción. Te escribiremos a <strong>${form.elements.correo.value}</strong> con los siguientes pasos.`;
    exito.classList.remove('d-none');
    exito.focus();
    form.reset();
    form.querySelectorAll('.is-valid, .is-invalid').forEach((c) => c.classList.remove('is-valid', 'is-invalid'));
    contador.textContent = '0 de 300 caracteres';
  });

  form.addEventListener('reset', () => {
    resumen.classList.add('d-none');
    form.querySelectorAll('.is-valid, .is-invalid').forEach((c) => { c.classList.remove('is-valid', 'is-invalid'); c.removeAttribute('aria-invalid'); });
    contador.textContent = '0 de 300 caracteres';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  inicializarCarrusel();
  inicializarContadores();
  inicializarBotonSubir();
  inicializarFormulario();
  const principal = document.getElementById('contenido-principal');
  if (principal) principal.setAttribute('tabindex', '-1');
});
