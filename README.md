# Cuánto vale mi tiempo

Calculadora de precios en pesos argentinos para personas que venden productos u ofrecen servicios. No requiere cuenta ni backend. Guarda un borrador local por navegador.

## Desarrollo

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Requiere Node.js 22.16+ (rama 22) o 24+. El modo de desarrollo no registra el service worker. Para verificar el modo sin conexión, abrí la vista previa con conexión, esperá a que se instale el service worker y recargá con la red desactivada. Para publicar, serví `dist/` en la raíz de un sitio HTTPS. La instalación depende del navegador (por ejemplo, en Safari para iOS: Compartir → Agregar a inicio).

## Cómo calcula

- **Tu hora**: usá una tarifa propia o dividí tu objetivo de remuneración mensual por las horas mensuales que realmente podés cobrar.
- **Costo**: incluye tus horas de trabajo, materiales y gastos del lugar. Para trabajos en lo del cliente, también incluye el gasto y las horas de traslado. Reparte los gastos fijos mensuales por hora cobrable y asigna esa parte a las horas de trabajo y traslado.
- **Ganancia**: el porcentaje es un recargo sobre tus costos, no un margen sobre el precio de venta. Para productos, se muestra el total de la tanda y el precio por unidad de venta: por ejemplo, un par de aros puede ser una unidad.
- **Referencias**: el rubro muestra datos comparables cuando hay fuentes verificadas; los ingresos laborales aparecen por separado. Los datos públicos en `src/references.ts` son nominales y fechados; no cambian el cálculo ni se actualizan automáticamente. No trates listados como precios de transacciones ni un ingreso de empleados como tarifa freelance.
- **Importes**: ingresá pesos con coma decimal y, si querés, punto de miles (`1.500,50`). La app acomoda el formato al salir del campo, sin modificar lo que escribís mientras editás.

## Publicación y actualizaciones

Vercel construye desde su integración Git con GitHub (`master` para producción). No hay un segundo pipeline de despliegue. El workflow de Dependabot solo considera sus PR abiertos, no borradores y del mismo repositorio hacia la rama por defecto. Espera el check `Validate PWA`, el resultado de Vercel y los demás checks o estados reportados por GitHub; comprueba el SHA al fusionar. Las reglas de protección de GitHub siguen aplicando. Si Vercel no publica un estado o check `Vercel` para un PR, el workflow lo deja abierto.
