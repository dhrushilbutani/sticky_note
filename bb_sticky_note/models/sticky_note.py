from odoo import models,fields,api
import psycopg2
import time

class StickyNote(models.Model):
    _name = "sticky.note"

    def get_model_selection(self):
        models_ids = self.env['ir.model'].sudo().search([])
        return [(i.model,i.name) for i in models_ids]
    title = fields.Char("Title")
    name = fields.Char("Name",copy=False)
    user_id = fields.Many2one('res.users', 'User', default=lambda self: self.env.user)
    color = fields.Char("Color",default="#fffc8a")
    top = fields.Float(default=150)
    left = fields.Float(default=150)
    record_ref = fields.Reference(
        selection=lambda x:x.get_model_selection(),
        string="Linked Record"
    )
    description = fields.Text(string="Description")

    @api.model
    def create(self,vals):
        if vals.get('name',False) == False:
            vals['name'] = self.env['ir.sequence'].next_by_code('sticky.note.seq')
        return super(StickyNote, self).create(vals)


    def write(self,vals):
        print(vals)
        return super(StickyNote, self).write(vals)

