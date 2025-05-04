// app/api/convert/route.js
export async function POST(request) {
    const formData = await request.formData();

    // Add format to formData if not present
    if (!formData.has('format')) {
        const format = 'mp3'; // Default format
        formData.append('format', format);
    }

    try {
        // Updated backend URL to point to VirtualBox Ubuntu server
        const response = await fetch('http://192.168.1.12:2001/api/convert', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            return Response.json({ error: errorData.error || 'Server error' }, { status: response.status });
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error('Error connecting to Python backend:', error);
        return Response.json({ error: 'Failed to connect to Python backend' }, { status: 500 });
    }
}