import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';
import { LEGAL_ENTITY } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Términos y Condiciones | None System',
  description: 'Condiciones de uso del servicio None System: planes, pagos, derecho de retracto y responsabilidades.',
};

export default function TermsPage() {
  return (
    <LegalPage title="Términos y Condiciones" subtitle="Aplican a la landing, el panel web y el bot de WhatsApp">
      <h2>1. Quiénes somos</h2>
      <p>
        El servicio es prestado por {LEGAL_ENTITY.name}, NIT {LEGAL_ENTITY.nit}, con domicilio en {LEGAL_ENTITY.address}.
        Contacto: {LEGAL_ENTITY.supportEmail}.
      </p>

      <h2>2. El servicio</h2>
      <p>
        None System es una herramienta para organizar gastos: lee con inteligencia artificial las imágenes y PDF de facturas,
        recibos y transferencias que envías, permite registrar gastos escritos sin recibo, y genera resúmenes y archivos
        exportables.
      </p>
      <ul>
        <li>
          <strong>No es asesoría contable, tributaria ni legal</strong> y no reemplaza a tu contador. No presenta declaraciones
          ni valida documentos ante la DIAN.
        </li>
        <li>
          La IA puede cometer errores. Eres responsable de revisar y corregir los datos antes de usarlos en tu contabilidad o
          declaraciones.
        </li>
        <li>
          La marca de "requisitos formales de factura (Art. 771-2 E.T.)" es una ayuda orientativa; la procedencia de costos,
          deducciones o impuestos descontables depende de tu situación tributaria.
        </li>
        <li>
          Los <strong>gastos manuales</strong> (escritos sin recibo) sirven para tu control personal y no constituyen soporte
          contable.
        </li>
      </ul>

      <h2>3. Cuenta y uso aceptable</h2>
      <ul>
        <li>Debes ser mayor de edad y entregar información veraz. Tu número de WhatsApp se verifica con un código.</li>
        <li>Eres responsable de la confidencialidad de tu contraseña y de la actividad de tu cuenta.</li>
        <li>
          Solo puedes cargar documentos que te pertenezcan o que estés autorizado a tratar. No envíes documentos de terceros
          sin su autorización ni contenido ilícito.
        </li>
        <li>
          Podemos suspender cuentas que hagan uso abusivo o fraudulento del servicio, informándote el motivo cuando sea
          posible.
        </li>
      </ul>

      <h2>4. Planes, precios y pagos</h2>
      <ul>
        <li>
          Los precios se expresan en pesos colombianos (COP) e informan el valor total a pagar por cada mes de servicio.
        </li>
        <li>
          Cada plan pagado da derecho a un número de comprobantes con imagen durante un mes contado desde la fecha de pago.
          El Plan Gratuito incluye 5 comprobantes con imagen y 30 gastos escritos al mes; en los planes pagados los
          gastos escritos son ilimitados.
        </li>
        <li>
          <strong>No hay renovación automática ni permanencia.</strong> Al terminar el periodo vuelves al Plan Gratuito sin
          cobros adicionales.
        </li>
        <li>
          El cupo no utilizado no es acumulable. Un comprobante procesado consume cupo aunque luego lo elimines; si el
          procesamiento falla, no se descuenta.
        </li>
        <li>
          Los pagos se procesan a través de Wompi (Bancolombia), pasarela de pagos certificada. None System no recibe ni
          almacena datos de tarjetas. El plan se activa cuando la pasarela confirma el pago.
        </li>
      </ul>

      <h2>5. Derecho de retracto y reversión del pago</h2>
      <p>
        Por tratarse de una venta a distancia, puedes ejercer el derecho de retracto dentro de los 5 días hábiles siguientes a
        la compra (Art. 47 Ley 1480 de 2011), escribiendo a {LEGAL_ENTITY.supportEmail}. Te reintegraremos el valor pagado
        dentro de los 30 días calendario siguientes. Si ya usaste parte del cupo, se descontará proporcionalmente el servicio
        prestado. También puedes solicitar la reversión del pago en los casos del Art. 51 de la Ley 1480 (fraude, operación no
        solicitada, servicio no prestado o no correspondiente a lo ofrecido).
      </p>

      <h2>6. Disponibilidad y responsabilidad</h2>
      <p>
        Trabajamos para que el servicio esté disponible de forma continua, pero puede haber interrupciones por
        mantenimiento o fallas de proveedores (por ejemplo, WhatsApp o los servicios de IA). En la medida permitida por la
        ley, no somos responsables por decisiones contables o tributarias tomadas con datos que no revisaste, ni por daños
        indirectos. Nada en estos términos limita los derechos que te otorga el Estatuto del Consumidor.
      </p>

      <h2>7. Datos personales</h2>
      <p>
        El tratamiento de tus datos se rige por nuestra <Link href="/privacidad">Política de Tratamiento de Datos</Link>.
        Puedes eliminar tu cuenta y tus datos en cualquier momento.
      </p>

      <h2>8. Cambios a estos términos</h2>
      <p>
        Si cambiamos estos términos de forma relevante te avisaremos con anticipación. Los cambios de precio no afectan un
        periodo ya pagado.
      </p>

      <h2>9. Peticiones, quejas y reclamos; ley aplicable</h2>
      <p>
        Puedes presentar PQR a {LEGAL_ENTITY.supportEmail} o por WhatsApp. Estos términos se rigen por las leyes de la
        República de Colombia. Como consumidor puedes acudir a la Superintendencia de Industria y Comercio (
        <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer">
          www.sic.gov.co
        </a>
        ).
      </p>
    </LegalPage>
  );
}
