//app/emails/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';

interface Email {
  id: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  receivedDate: string;
  isRead: boolean;
  hasAttachments: boolean;
}

interface EmailDetail extends Email {
  bodyText?: string;
  bodyHtml?: string;
  toEmails?: string[];
}

interface EmailsResponse {
  emails: Email[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [emailsData, setEmailsData] = useState<EmailsResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { isLoggedIn } = useAuth();
  const router = useRouter();

  const goBack = () => {
    router.push('/');
  };

  // Función para obtener emails
  const fetchEmails = async (page: number = 1, search: string = '') => {
    setIsLoading(true);
    setError('');

    try {
      const orchestratorUrl = process.env.NEXT_PUBLIC_MS_ORCHESTRATOR_URL || 'http://localhost:3003';
      let url = `${orchestratorUrl}/emails/inbox?userId=1&page=${page}&limit=10`;
      
      if (search.trim()) {
        url = `${orchestratorUrl}/emails/search?userId=1&q=${encodeURIComponent(search)}&page=${page}&limit=10`;
      }

      console.log(`🔵 Llamando a: ${url}`);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setEmailsData(data.data);
        setEmails(data.data.emails);
        console.log(`✅ Emails obtenidos: ${data.data.emails.length} de ${data.data.total} totales`);
      } else {
        throw new Error('Error en la respuesta del servidor');
      }
    } catch (err: any) {
      console.error('❌ Error obteniendo emails:', err);
      setError(err.message || 'Error cargando emails');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ useEffect SIMPLIFICADO para evitar loops
  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    // Solo cargar emails una vez al montar
    fetchEmails(1, '');
  }, []); // ✅ Sin dependencias para evitar loops

  // ✅ useEffect separado para cambios de página
  useEffect(() => {
    if (isLoggedIn && currentPage > 1) {
      fetchEmails(currentPage, searchTerm);
    }
  }, [currentPage]); // Solo cuando cambia la página

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchEmails(1, searchTerm);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Abrir email específico
  const openEmail = async (emailId: string) => {
    setIsLoadingEmail(true);
    setError('');
    
    try {
      const orchestratorUrl = process.env.NEXT_PUBLIC_MS_ORCHESTRATOR_URL || 'http://localhost:3003';
      const response = await fetch(`${orchestratorUrl}/emails/${emailId}?userId=1`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSelectedEmail(data.data);
        console.log(`✅ Email abierto: ${data.data.subject}`);
      } else {
        throw new Error('Error obteniendo email');
      }
    } catch (err: any) {
      console.error('❌ Error abriendo email:', err);
      setError(err.message || 'Error abriendo email');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const closeEmail = () => {
    setSelectedEmail(null);
  };

  // ✅ Verificación simple de auth
  if (!isLoggedIn) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-4 text-gray-600">Cargando emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="flex items-center space-x-4">
            <button
              onClick={goBack}
              className="text-indigo-600 hover:text-indigo-500"
            >
              ← Volver al Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">📧 Emails</h1>
          </div>
          <div>
            <span className="text-sm text-gray-600">
              {emailsData && `${emailsData.total} emails totales`}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4">
        {/* Búsqueda */}
        <div className="card mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar emails..."
              className="input"
              style={{ paddingLeft: '1rem' }}
            />
            <button type="submit" className="btn btn-primary">
              🔍 Buscar
            </button>
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                  fetchEmails(1, '');
                }}
                className="btn btn-secondary"
              >
                ✖️ Limpiar
              </button>
            )}
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border rounded-lg" style={{ borderColor: '#fecaca' }}>
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => fetchEmails(currentPage, searchTerm)}
              className="mt-2 btn btn-secondary"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Modal de email detalle */}
        {selectedEmail && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeEmail}
          >
            <div 
              className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedEmail.subject}
                  </h2>
                  <button
                    onClick={closeEmail}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="border-b pb-4 mb-4">
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">De: </span>
                      <span>{selectedEmail.fromName} &lt;{selectedEmail.fromEmail}&gt;</span>
                    </div>
                    <div>
                      <span className="font-medium">Fecha: </span>
                      <span>
                        {new Date(selectedEmail.receivedDate).toLocaleString('es-ES')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {isLoadingEmail ? (
                    <div className="text-center py-8">
                      <div className="spinner"></div>
                      <p className="mt-2 text-gray-600">Cargando contenido...</p>
                    </div>
                  ) : (
                    <>
                      {selectedEmail.bodyHtml ? (
                        <div 
                          className="prose max-w-none"
                          dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                        />
                      ) : selectedEmail.bodyText ? (
                        <div className="whitespace-pre-wrap text-gray-800">
                          {selectedEmail.bodyText}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          No se pudo cargar el contenido del email
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t">
                  <button
                    onClick={closeEmail}
                    className="btn btn-secondary"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de emails */}
        {emails.length > 0 ? (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {searchTerm ? `Resultados para "${searchTerm}"` : 'Inbox'}
            </h3>
            
            <div className="space-y-3">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => openEmail(email.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`inline-block w-3 h-3 rounded-full ${email.isRead ? 'bg-gray-300' : 'bg-blue-500'}`}></span>
                        <span className="font-medium text-gray-900">
                          {email.fromName || email.fromEmail}
                        </span>
                        {email.hasAttachments && <span>📎</span>}
                      </div>
                      <h4 className="font-semibold text-gray-800 mb-1">
                        {email.subject}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {email.fromEmail}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-500">
                        {new Date(email.receivedDate).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            {emailsData && emailsData.totalPages > 1 && (
              <div className="mt-6 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Página {emailsData.page} de {emailsData.totalPages}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!emailsData.hasPreviousPage}
                    className="btn btn-secondary"
                    style={{ 
                      opacity: emailsData.hasPreviousPage ? 1 : 0.5,
                      cursor: emailsData.hasPreviousPage ? 'pointer' : 'not-allowed'
                    }}
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!emailsData.hasNextPage}
                    className="btn btn-secondary"
                    style={{ 
                      opacity: emailsData.hasNextPage ? 1 : 0.5,
                      cursor: emailsData.hasNextPage ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          !isLoading && (
            <div className="card text-center py-12">
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'No se encontraron emails' : 'No hay emails para mostrar'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                    fetchEmails(1, '');
                  }}
                  className="btn btn-primary"
                >
                  Ver todos los emails
                </button>
              )}
            </div>
          )
        )}
      </main>
    </div>
  );
}