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
- **Referencias**: los datos públicos en `src/references.ts` son nominales y fechados; no cambian el cálculo ni se actualizan automáticamente. Revisá fuente, período, alcance y unidad antes de actualizarlos. No trates listados como precios de transacciones ni un ingreso de empleados como tarifa freelance.
