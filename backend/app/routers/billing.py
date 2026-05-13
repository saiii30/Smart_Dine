from __future__ import annotations

import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_active_user, require_roles
from app.database import get_db
from app.routers.orders import _serialize_order

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.post("/orders/{order_id}/finalize", response_model=schemas.OrderOut)
def finalize_bill(
    order_id: int,
    body: schemas.BillPayload,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_roles("ADMIN", "MANAGER", "CASHIER")),
):
    o = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    tax_rate = body.tax_rate if body.tax_rate is not None else o.tax_rate
    tax_amt = round(o.subtotal * float(tax_rate), 2)
    total = round(o.subtotal + tax_amt - body.discount_amount, 2)
    paid = round(sum(p.amount for p in body.payments), 2)
    if abs(paid - total) > 0.05:
        raise HTTPException(
            status_code=400,
            detail=f"Payments ({paid}) must equal bill total ({total})",
        )
    db.query(models.Payment).filter(models.Payment.order_id == order_id).delete()
    for p in body.payments:
        db.add(
            models.Payment(
                order_id=order_id,
                amount=p.amount,
                tax_amount=p.tax_amount,
                discount_amount=p.discount_amount,
                payment_method=p.payment_method,
                split_label=p.split_label,
            )
        )
    o.tax_rate = float(tax_rate)
    o.discount_amount = body.discount_amount
    o.total_amount = total
    o.status = models.OrderStatus.COMPLETED.value
    if o.table_id:
        tbl = db.query(models.DiningTable).filter(models.DiningTable.id == o.table_id).first()
        if tbl:
            tbl.status = models.TableStatus.AVAILABLE.value
    db.commit()
    db.refresh(o)
    return _serialize_order(o)


@router.get("/orders/{order_id}/invoice.pdf")
def invoice_pdf(
    order_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_active_user),
):
    o = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    buf = io.BytesIO()
    pdf = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    y = height - 50
    pdf.setTitle("Smart Dine Invoice")
    pdf.drawString(50, y, "Smart Dine — Invoice")
    y -= 30
    pdf.drawString(50, y, f"Order #{o.id}  •  {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    y -= 40
    pdf.drawString(50, y, f"Subtotal: {o.subtotal:.2f}")
    y -= 20
    pdf.drawString(50, y, f"Tax rate: {o.tax_rate:.2%}  Total: {o.total_amount:.2f}")
    y -= 30
    for li in o.items:
        name = li.menu_item.name if li.menu_item else "Item"
        pdf.drawString(50, y, f"{name} x{li.quantity} @ {li.unit_price:.2f}")
        y -= 18
        if y < 80:
            pdf.showPage()
            y = height - 50
    y -= 20
    pays = db.query(models.Payment).filter(models.Payment.order_id == order_id).all()
    if pays:
        pdf.drawString(50, y, "Payments:")
        y -= 20
        for p in pays:
            pdf.drawString(
                50,
                y,
                f"  {p.payment_method}  {p.amount:.2f}  {p.split_label or ''}",
            )
            y -= 18
    pdf.showPage()
    pdf.save()
    buf.seek(0)
    return Response(
        content=buf.read(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="invoice-{order_id}.pdf"'},
    )
