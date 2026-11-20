# Cuánto vale mi tiempo

Calculadora de precios en pesos argentinos para personas que venden productos u ofrecen servicios. No requiere cuenta ni backend. Guarda un borrador local por navegador.

## Catálogo y presupuestos

Desde **Catálogo y presupuestos** podés crear y editar insumos con costo y tiempo por unidad, y productos con materiales adicionales, minutos propios de trabajo/ensamble y una receta de varios insumos. El tiempo de un producto suma su ensamble y los minutos de cada insumo multiplicados por la cantidad usada.

Agregá uno o varios productos o insumos al presupuesto, indicá cuántos necesitás o creá ítems e insumos exclusivos de ese presupuesto. Cada ítem conserva una copia de sus costos, receta y tiempos: editar o eliminar el catálogo no cambia un presupuesto armado. Para usar valores actualizados, quitá el ítem y agregalo de nuevo. Los insumos usados en recetas no se pueden eliminar hasta quitarlos de esas recetas.

La tarifa por hora es común al presupuesto. La **ganancia general** es un porcentaje de recargo sobre costos; cada ítem puede reemplazarlo por un porcentaje propio (vacío usa el general; `0` significa sin ganancia). Se muestran precios unitarios, subtotales, ganancia y tiempo total. Los minutos propios, materiales y recetas también se pueden ajustar solo para un presupuesto. Los gastos o impuestos adicionales deben incluirse en los materiales si corresponde; no se agregan automáticamente.

En **Mis espacios** podés crear, editar y eliminar varios lugares con nombre y costo por hora. Cada presupuesto permite elegir **un solo espacio** (o ninguno). Su costo se aplica al tiempo de producción completo de cada ítem, incluidos los insumos y las cantidades de productos, y se suma al costo antes de calcular la ganancia general o propia. El desglose muestra el espacio por unidad y su costo total, separado de tu trabajo. No dupliques gastos del espacio que ya hayas incluido en otros costos.

El presupuesto conserva una copia del nombre y costo horario del espacio elegido: editarlo o eliminarlo del catálogo no cambia un presupuesto armado. **Actualizar con los valores del catálogo** aplica explícitamente los cambios del espacio elegido. Los borradores anteriores siguen funcionando sin costo de espacio hasta que elijas uno.

El catálogo inicial transcribe los 10 productos y los 7 modelos de cápsula de **Cotizador Capsulas.xlsx**. Los modelos solo traen minutos, por lo que su costo inicial es cero; los productos conservan el costo total de materia prima y su tiempo de ensamble. Solo Vincha tiene una receta documentada (13 hojas). Completá las recetas restantes antes de cotizar y evitá contar dos veces los materiales al agregar costos a los insumos. La tarifa inicial de $9.500/h y la ganancia de 200% (multiplicador ×3 en el Excel) son ejemplos editables, no referencias de mercado.

El catálogo y el presupuesto actual se guardan automáticamente en este navegador, separados del borrador de la calculadora paso a paso. No se sincronizan entre dispositivos. **Nuevo presupuesto** vacía los ítems, el nombre y la selección de espacio; conserva los catálogos (incluidos tus espacios), la tarifa de trabajo y la ganancia general.

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
