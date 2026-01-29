import {Stack, Typography} from "@mui/material";
import CustomModal from "@/components/customs/custom-modal.tsx";
import CustomButton from "@/components/ui/button.tsx";

interface Props {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
    title: string;
    message: string;
}

const DeleteConfirmationModal = ({open, onClose, onConfirm, isLoading, title, message}: Props) => {
    return (
        <CustomModal
            open={open}
            onClose={onClose}
            modalStyles={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                maxWidth: {xs: "90vw", sm: 500},
            }}
        >
            <Typography variant="h6" fontWeight="600">
                {title}
            </Typography>
            <Typography sx={{mt: 1, fontSize: ".8rem"}} variant={"body1"}>
                {message}
            </Typography>

            <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{mt: 3}}>
                <CustomButton
                    title="Yes, Delete"
                    variant="contained"
                    onClick={onConfirm}
                    disabled={isLoading}
                    // color="error"
                    sx={{width: "fit-content"}}
                />
                <CustomButton
                    title="Cancel"
                    onClick={onClose}
                    disabled={isLoading}
                    sx={{width: "fit-content"}}
                />
            </Stack>
        </CustomModal>
    );
};

export default DeleteConfirmationModal;
