# -*- coding: utf-8 -*-
{
    "name": "Sticky Notes on Any Record",
    "version": "18.0.0.1",
    "category": "Extra Tools",
    "summary": "Add sticky notes to any record in Odoo form views.",
    "description": """
            Add sticky notes with title, description, and color to any record from the form view. 
            Perfect for annotations, reminders, or tracking feedback directly on customer, sales, project, or other records.
            """,
    'author': "Dhrushil Butani",
    'depends': ['base', 'web'],
    'data': [
        'data/data.xml',
        'security/ir.model.access.csv',
        'views/sticky_note_view.xml',
    ],
    'images': ['static/description/image1.png','static/description/image2.png','static/description/image3.png','static/description/image4.png'],
    'assets': {
        'web.assets_backend': [
            'bb_sticky_note/static/src/js/form_controller.js',
            'bb_sticky_note/static/src/xml/form_controller.xml',
            'bb_sticky_note/static/src/css/style.css'

        ]},
    "installable": True,
    "application": False,
    "license": "LGPL-3",
}
