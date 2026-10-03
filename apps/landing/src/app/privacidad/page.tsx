import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';
import { LEGAL_ENTITY } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Política de Tratamiento de Datos Personales | None System',
  description: 'Cómo None System recolecta, usa, protege y elimina tus datos personales conforme a la Ley 1581 de 2012.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Política de Tratamiento de Datos Personales"
      subtitle="Ley Estatutaria 1581 de 2012 y Decreto 1074 de 2015 (Capítulo 25)"
    >
      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li>
          <strong>Razón social:</strong> {LEGAL_ENTITY.name}
        </li>
        <li>
          <strong>NIT:</strong> {LEGAL_ENTITY.nit}
        </li>
        <li>
          <strong>Domicilio:</strong> {LEGAL_ENTITY.address}
        </li>
        <li>
          <strong>Correo para peticiones, consultas y reclamos:</strong> {LEGAL_ENTITY.privacyEmail}
        </li>
      </ul>

      <h2>2. Datos que tratamos</h2>
      <ul>
        <li>
          <strong>Datos de identificación y contacto:</strong> nombre, correo electrónico, número de WhatsApp y nombre de perfil
          de WhatsApp.
        </li>
        <li>
          <strong>Información financiera que tú nos envías:</strong> imágenes y PDF de facturas, recibos y comprobantes de
          transferencia, y los datos que contienen (comercio, NIT, valores, impuestos, fechas, referencias, entidad
          financiera), además de los gastos que escribes manualmente.
        </li>
        <li>
          <strong>Datos de la cuenta y uso:</strong> plan contratado, consumo de cupo, registros de pagos, fecha y canal de tu
          autorización, dirección IP desde la que te registraste y registros técnicos de seguridad.
        </li>
      </ul>
      <p>
        No solicitamos datos sensibles (Art. 5 Ley 1581). Si un documento que envías los contiene, te pedimos no
        enviarlo o tachar esa información. El servicio no está dirigido a menores de 18 años.
      </p>

      <h2>3. Finalidades</h2>
      <ol>
        <li>Prestar el servicio: leer tus comprobantes con inteligencia artificial, registrar tus gastos y mostrarte resúmenes.</li>
        <li>Crear y administrar tu cuenta, verificar tu número de WhatsApp y proteger el acceso a tu información.</li>
        <li>Gestionar tu plan, cupo y pagos, y cumplir obligaciones contables y tributarias propias.</li>
        <li>Enviarte por WhatsApp mensajes relacionados con el servicio (respuestas del bot, códigos de verificación, avisos de cupo).</li>
        <li>Atender peticiones, quejas y reclamos, y prevenir fraudes o usos indebidos.</li>
      </ol>
      <p>
        No vendemos tus datos ni los usamos para publicidad de terceros. Solo te enviaremos comunicaciones comerciales si
        lo autorizas de forma separada.
      </p>

      <h2>4. Proveedores y transferencias internacionales</h2>
      <p>
        Para prestar el servicio compartimos datos con encargados que los tratan por cuenta nuestra y bajo contrato,
        algunos ubicados fuera de Colombia:
      </p>
      <ul>
        <li>
          <strong>Google LLC (Gemini API, Estados Unidos):</strong> analiza las imágenes, PDF y textos que envías para extraer
          los datos contables.
        </li>
        <li>
          <strong>Meta Platforms (WhatsApp Business Platform):</strong> transporta los mensajes entre tú y nuestro bot.
        </li>
        <li>
          <strong>Wompi / Bancolombia (Colombia):</strong> procesamiento de pagos. Recibe tu nombre, correo y teléfono para la
          transacción; nosotros no recibimos datos de tarjetas.
        </li>
        <li>
          <strong>Resend (Estados Unidos):</strong> envío de correos de verificación y notificaciones de la cuenta.
        </li>
        <li>
          <strong>Proveedores de infraestructura en la nube:</strong> alojamiento de la aplicación y de la base de datos.
        </li>
      </ul>
      <p>
        Al autorizar esta política aceptas expresamente esta transmisión internacional de datos (Art. 26 Ley 1581). Exigimos
        a estos proveedores medidas de seguridad y confidencialidad adecuadas.
      </p>

      <h2>5. Seguridad</h2>
      <ul>
        <li>Las imágenes y PDF se almacenan cifrados con AES-256-GCM y solo tu cuenta puede descargarlos.</li>
        <li>Las conexiones viajan cifradas (HTTPS) y las contraseñas se guardan con hash bcrypt.</li>
        <li>Verificamos con un código por WhatsApp que el número registrado te pertenece.</li>
        <li>Aplicamos controles de acceso, límites contra intentos abusivos y registros de seguridad sin datos personales.</li>
      </ul>
      <p>
        Ningún sistema es infalible. Si ocurre un incidente que comprometa tus datos, te lo informaremos y lo reportaremos a
        la Superintendencia de Industria y Comercio cuando corresponda.
      </p>

      <h2>6. Tus derechos</h2>
      <p>Como titular puedes, de forma gratuita:</p>
      <ul>
        <li>Conocer, actualizar y rectificar tus datos personales.</li>
        <li>Solicitar prueba de la autorización que nos otorgaste.</li>
        <li>Ser informado sobre el uso que les damos.</li>
        <li>Revocar la autorización y pedir la supresión de tus datos.</li>
        <li>Acceder gratuitamente a tus datos.</li>
        <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) una vez agotado el trámite ante nosotros.</li>
      </ul>

      <h2>7. Cómo ejercer tus derechos</h2>
      <ul>
        <li>
          <strong>Autoservicio:</strong> en el panel web (Perfil) puedes descargar tus datos y eliminar tu cuenta. Por WhatsApp
          escribe <strong>ELIMINAR MIS DATOS</strong> para borrar tu cuenta o <strong>PRIVACIDAD</strong> para ver esta
          información.
        </li>
        <li>
          <strong>Por correo:</strong> escribe a {LEGAL_ENTITY.privacyEmail} indicando tu nombre, número de WhatsApp, la
          solicitud y los documentos que quieras hacer valer.
        </li>
      </ul>
      <p>
        <strong>Consultas:</strong> respondemos en máximo 10 días hábiles, prorrogables por 5 días hábiles más informándote el
        motivo. <strong>Reclamos</strong> (corrección, actualización, supresión o incumplimiento): respondemos en máximo 15
        días hábiles, prorrogables por 8 días hábiles más. Si el reclamo está incompleto, te pediremos completarlo dentro de
        los 5 días siguientes.
      </p>

      <h2>8. Conservación y supresión</h2>
      <p>
        Conservamos tus datos mientras tengas una cuenta activa. Si eliminas tu cuenta, borramos de forma permanente tus
        comprobantes, imágenes, gastos y tu plan. Conservamos únicamente los registros de pagos realizados, sin vínculo a tu
        cuenta, durante el tiempo que exigen las normas contables y tributarias. Las copias de seguridad se sobrescriben en
        ciclos regulares.
      </p>

      <h2>9. Vigencia y cambios</h2>
      <p>
        Esta política rige desde la fecha indicada al inicio. Si la modificamos de forma sustancial, te avisaremos antes de
        aplicar los cambios y, cuando se requiera, te pediremos una nueva autorización. Las bases de datos estarán vigentes
        mientras se presten los servicios y durante los plazos legales de conservación.
      </p>
      <p>
        Consulta también nuestros <Link href="/terminos">Términos y Condiciones</Link>.
      </p>
    </LegalPage>
  );
}
