// app/api/download/[filename]/route.js
export async function GET(request, { params }) {
    const { filename } = params;

    try {
        // Updated backend URL to point to VirtualBox Ubuntu server
        const response = await fetch(`http://192.168.1.12:2001/api/download/${filename}`);

        if (!response.ok) {
            return new Response('File not found', { status: 404 });
        }

        const fileBlob = await response.blob();
        return new Response(fileBlob, {
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Error downloading file:', error);
        return new Response('Failed to download file', { status: 500 });
    }
}